import express from "express";
import authMiddleware from "../middleware/auth.js";
import {
  getAllMessages,
  getMyMessages,
  replyMessage,
  sendMessage,
  getRepliedCount,
  markRepliedAsRead,
} from "../controller/messageControllers.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/", sendMessage); // user
router.get("/my", getMyMessages); // user

router.get("/all", getAllMessages); // admin
router.put("/reply/:id", replyMessage); // admin

// count of replied messages for logged-in user (used for user badge)
router.get("/count", getRepliedCount);
// mark replied messages as read for the logged-in user
router.put("/mark-read", markRepliedAsRead);

export default router;
