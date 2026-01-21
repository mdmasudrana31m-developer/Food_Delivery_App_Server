import express from "express";
import {
  confirmPayment,
  createOrder,
  getOrderById,
  getOrders,
  updateAnyOrder,
  updateOrder,
} from "../controller/orderController.js";
import authMiddleware from "../middleware/auth.js";

const orderRouter = express.Router();

orderRouter.get("/getall", getOrders);
orderRouter.put("/getall/:id", updateAnyOrder);

orderRouter.use(authMiddleware);

orderRouter.post("/", createOrder);
orderRouter.get("/", getOrders);
orderRouter.post("/confirm", confirmPayment);
orderRouter.get("/:id", getOrderById);
orderRouter.put("/:id", updateOrder);

export default orderRouter;
