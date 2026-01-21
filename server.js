import express from "express";
import cors from "cors";
import { config } from "dotenv";
import { connectDB } from "./Data/db.js";
import { userRouter } from "./router/userRouter.js";
import path from "path";
import { fileURLToPath } from "url";
import itemRouter from "./router/itemRouter.js";
import { cartItemRouter } from "./router/cartRoute.js";
import orderRouter from "./router/orderRoute.js";
import router from "./router/messageRouter.js";
import { initSocket } from "./socket.js";

const app = express();
config();

const port = 8000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        "https://food-delivery-app-client.vercel.app",
        "http://localhost:5174",
      ];

      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by Cors"));
      }
    },
    credentials: true,
  }),
);
connectDB();

app.get("/", (req, res) => {
  res.send("Server is running");
});

app.use("/api/user", userRouter);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/item", itemRouter);
app.use("/api/cart", cartItemRouter);
app.use("/api/orders", orderRouter);
app.use("/api/messages", router);

const server = app.listen(port, () => {
  console.log(`Server is running on port http://localhost:${port}`);
});

// initialize socket.io with the running server
try {
  initSocket(server);
  console.log("Socket.io initialized");
} catch (err) {
  console.error("Failed to initialize socket.io", err);
}
