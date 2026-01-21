import express from "express";
import {
  adminLogin,
  loginUser,
  registerUser,
} from "../controller/userContorller.js";

export const userRouter = express.Router();

userRouter.post("/register", registerUser);
userRouter.post("/login", loginUser);
userRouter.post("/admin", adminLogin);
