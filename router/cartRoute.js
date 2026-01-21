import express from "express";
import authMiddleware from "../middleware/auth.js";
import { addToCart, clearCart, deleteCartItem, getCart, updateCartItem } from "../controller/cartController.js";

export const cartItemRouter = express.Router();

cartItemRouter.route("/").get(authMiddleware, getCart)
.post(authMiddleware, addToCart);

cartItemRouter.post('/clear', authMiddleware, clearCart);
cartItemRouter.route('/:id')
.put(authMiddleware, updateCartItem)
.delete(authMiddleware, deleteCartItem)


