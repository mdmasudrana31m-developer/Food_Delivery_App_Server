import Message from "../model/messageModel.js";
import userModel from "../model/userModel.js";
import { getIo } from "../socket.js";

export const sendMessage = async (req, res) => {
  try {
    const { subject, message } = req.body;

    // Basic input validation
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "Unauthorized: user not found" });
    }

    if (!subject || !message) {
      return res
        .status(400)
        .json({ message: "Subject and message are required" });
    }

    // Prefer email from decoded token, but fall back to DB lookup for older tokens
    let userEmail = req.user.email || req.userEmail || "";
    if (!userEmail) {
      try {
        const u = await userModel.findById(req.user._id).select("email");
        if (u && u.email) userEmail = u.email;
      } catch (err) {
        console.error("User lookup failed while sending message:", err);
      }
    }

    if (!userEmail) {
      return res.status(400).json({ message: "User email missing from token" });
    }

    let newMessage;
    try {
      newMessage = await Message.create({
        user: req.user._id,
        userEmail,
        subject,
        message,
      });
    } catch (err) {
      console.error("Message.create error:", err);
      // If it's a validation error, send the details back
      const msg = err.message || "Message create failed";
      return res.status(500).json({ message: msg });
    }

    // Emit real-time event to admin room
    try {
      const io = getIo();
      if (io) io.to("admin").emit("newMessage", newMessage);
    } catch (emitErr) {
      console.error("Failed to emit newMessage", emitErr);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("sendMessage error:", error);
    res.status(500).json({ message: error.message || "Message send failed" });
  }
};

export const getMyMessages = async (req, res) => {
  try {
    const messages = await Message.find({ user: req.user._id }).sort({
      createdAt: -1,
    });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: "Failed to load messages" });
  }
};

export const getAllMessages = async (req, res) => {
  try {
    const messages = await Message.find().sort({ createdAt: -1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: "Failed to load messages" });
  }
};

export const replyMessage = async (req, res) => {
  try {
    const { reply } = req.body;

    const msg = await Message.findByIdAndUpdate(
      req.params.id,
      { reply, status: "replied" },
      { new: true }
    );

    // Emit real-time event to the specific user (if available)
    try {
      const io = getIo();
      if (io && msg && msg.user) {
        io.to(`user_${msg.user}`).emit("messageReplied", msg);
      }
    } catch (emitErr) {
      console.error("Failed to emit messageReplied", emitErr);
    }

    res.json(msg);
  } catch (error) {
    res.status(500).json({ message: "Reply failed" });
  }
};

// return count of messages with status 'replied' for current user
export const getRepliedCount = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const count = await Message.countDocuments({
      user: req.user._id,
      status: "replied",
    });

    res.json({ count });
  } catch (err) {
    console.error("getRepliedCount error:", err);
    res.status(500).json({ message: "Failed to get count" });
  }
};

// mark all replied messages for this user as read
export const markRepliedAsRead = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const result = await Message.updateMany(
      { user: req.user._id, status: "replied" },
      { $set: { status: "read" } }
    );

    // notify user sockets that messages were marked read
    try {
      const io = getIo();
      if (io)
        io.to(`user_${req.user._id}`).emit("messagesMarkedRead", {
          modifiedCount: result.modifiedCount || result.nModified || 0,
        });
    } catch (emitErr) {
      console.error("Failed to emit messagesMarkedRead", emitErr);
    }

    res.json({
      success: true,
      modifiedCount: result.modifiedCount || result.nModified || 0,
    });
  } catch (err) {
    console.error("markRepliedAsRead error:", err);
    res.status(500).json({ message: "Failed to mark messages as read" });
  }
};
