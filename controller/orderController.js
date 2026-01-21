import Stripe from "stripe";
import Order from "../model/orderModel.js";
import { getIo } from "../socket.js";

let _stripe = null;
let _stripeInitAttempted = false;

function getStripe() {
  if (_stripeInitAttempted && _stripe) return _stripe;
  _stripeInitAttempted = true;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.warn("[orderController] STRIPE_SECRET_KEY not set");
    return null;
  }
  try {
    _stripe = new Stripe(key);
    console.log("[orderController] Stripe initialized");
    return _stripe;
  } catch (err) {
    console.error("[orderController] Failed to initialize Stripe:", err);
    _stripe = null;
    return null;
  }
}

export const createOrder = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      phone,
      email,
      address,
      city,
      zipCode,
      paymentMethod,
      subtotal,
      tax,
      total,
      items,
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: "Invalid or empty items array",
      });
    }

    const orderItems = items.map(({ name, price, quantity, imageUrl }) => ({
      item: {
        name: name || "unknown",
        price: Number(price) || 0,
        imageUrl: imageUrl || "",
      },
      quantity: Number(quantity) || 1,
    }));

    const shippingCost = 0;
    console.log("Order data:", {
      user: req.user?._id || null,
      firstName,
      lastName,
      phone,
      email,
      address,
      city,
      zipCode,
      paymentMethod,
      subtotal,
      tax,
      total,
      shipping: shippingCost,
      items: orderItems,
    });
    let newOrder;

    if (paymentMethod === "online") {
      const stripe = getStripe();
      if (!stripe) {
        return res
          .status(500)
          .json({ message: "Payment provider not configured" });
      }
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",

        line_items: orderItems.map((o) => ({
          price_data: {
            currency: "usd",
            product_data: { name: o.item.name },
            unit_amount: Math.round(o.item.price * 100),
          },
          quantity: o.quantity,
        })),

        customer_email: email,
        success_url: `${process.env.FRONTEND_URL}/checkout?payment_status=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/checkout?payment_status=cancel`,
        metadata: { firstName, lastName, email, phone },
      });

      newOrder = new Order({
        user: req.user?._id || null,
        firstName,
        lastName,
        phone,
        email,
        address,
        city,
        zipCode,
        paymentMethod,
        subtotal,
        tax,
        total,
        shipping: shippingCost,
        items: orderItems,
        paymentIntentId: session.payment_intent || null,
        sessionId: session.id,
        paymentStatus: "pending",
      });

      await newOrder.save();
      return res.status(201).json({
        order: newOrder,
        checkoutUrl: session.url,
      });
    }

    // For non-online payments (e.g., cash on delivery), create the order
    // with paymentStatus succeeded (or pending depending on your flow)
    newOrder = new Order({
      user: req.user?._id || null,
      firstName,
      lastName,
      phone,
      email,
      address,
      city,
      zipCode,
      paymentMethod,
      subtotal,
      tax,
      total,
      shipping: shippingCost,
      items: orderItems,
      paymentStatus: paymentMethod === "online" ? "pending" : "succeeded",
    });

    await newOrder.save();
    return res.status(201).json({ order: newOrder, checkoutUrl: null });
  } catch (error) {
    console.log("CreateOrder Error:", error);
    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};

export const confirmPayment = async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId)
      return res.status(400).json({
        message: "SessionId required",
      });

    const stripe = getStripe();
    if (!stripe) {
      return res
        .status(500)
        .json({ message: "Payment provider not configured" });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === "paid") {
      const order = await Order.findOneAndUpdate(
        { sessionId: sessionId },
        { paymentStatus: "succeeded" },
        { new: true }
      );

      if (!order)
        return res.status(404).json({
          message: "Order not found",
        });
      return res.json(order);
    }
    return res.status(400).json({
      message: "Payment not complete",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

export const getOrders = async (req, res) => {
  try {
    let filter = {};

    // Case 1: Fetch by email (public order lookup)
    if (req.query.email) {
      filter = { email: req.query.email };
    }
    // Case 2: logged-in user
    else if (req.user && req.user._id) {
      filter = { user: req.user._id };
    }

    const rawOrders = await Order.find(filter).sort({ createdAt: -1 }).lean();

    const formatted = rawOrders.map((o) => ({
      ...o,
      items: (o.items || []).map((i) => ({
        _id: i._id,
        item: i.item,
        quantity: i.quantity,
      })),
      createdAt: o.createdAt,
      paymentStatus: o.paymentStatus,
    }));

    return res.json(formatted);
  } catch (error) {
    console.error("getOrders Error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

export const updateAnyOrder = async (req, res) => {
  try {
    const updated = await Order.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return res.status(404).json({ message: "Order not found" });
    }
    // Emit real-time update to the specific user who owns this order
    try {
      const io = getIo();
      if (io && updated && updated.user) {
        io.to(`user_${updated.user}`).emit("orderUpdated", updated);
      }
    } catch (emitErr) {
      console.error("Failed to emit orderUpdated", emitErr);
    }

    res.json(updated);
  } catch (error) {
    res
      .status(500)
      .json({ message: "updateAnyOrder Error", error: error.message });
  }
};

export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) return res.status(404).json({ message: "Order not found" });

    const isOrderOwner =
      order.user && req.user && order.user.equals(req.user._id);
    const isEmailMatch = req.query.email && order.email === req.query.email;

    if (!isOrderOwner && !isEmailMatch) {
      return res.status(403).json({ message: "Access Denied" });
    }

    return res.json(order);
  } catch (error) {
    res.status(500).json({
      message: "getOrderById Error",
      error: error.message,
    });
  }
};

export const updateOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) return res.status(404).json({ message: "Order not found" });

    const isOrderOwner =
      order.user && req.user && order.user.equals(req.user._id);
    const isEmailMatch = req.body.email && order.email === req.body.email;

    if (!isOrderOwner && !isEmailMatch) {
      return res.status(403).json({ message: "Access Denied" });
    }

    const updated = await Order.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    return res.json(updated);
  } catch (error) {
    res.status(500).json({
      message: "updateOrder Error",
      error: error.message,
    });
  }
};
