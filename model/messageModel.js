import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    userEmail: {
      type: String,
      required: true,
    },

    adminEmail: {
      type: String,
      default: "admin@gmail.com",
    },

    subject: {
      type: String,
      required: true,
    },

    message: {
      type: String,
      required: true,
    },

    reply: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["unread", "read", "replied"],
      default: "unread",
    },
  },
  { timestamps: true }
);

const Message =  mongoose.model("Message", messageSchema);
export default Message;
