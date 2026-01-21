import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import {
  createItem,
  deleteItem,
  getItems,
} from "../controller/itemController.js";

const itemRouter = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDir = path.join(__dirname, "../uploads");

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const upload = multer({ storage });

itemRouter.post("/", upload.single("image"), createItem);
itemRouter.get("/", getItems);
itemRouter.delete("/:id", deleteItem);

export default itemRouter;
