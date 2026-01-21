import itemModel from "../model/itemModel.js";

export const createItem = async (req, res, next) => {
  try {
    const { name, description, category, price, rating, hearts } = req.body;

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : "";

    const total = Number(price) || 0;

    const newItem = new itemModel({
      name,
      description,
      category,
      price,
      rating,
      hearts,
      imageUrl,
      total,
    });

    const saved = await newItem.save();
    // return saved item with full image URL (if present)
    const host = `${req.protocol}://${req.get("host")}`;
    const result = saved.toObject();
    result.imageUrl = result.imageUrl ? host + result.imageUrl : "";
    return res.status(201).json(result);
  } catch (error) {
    if (error.code == 11000) {
      res.status(400).json({
        message: "Item name already exits",
      });
    } else {
      next(error);
    }
  }
};

export const getItems = async (req, res, next) => {
  try {
    // fetch items sorted by newest first
    const items = await itemModel.find().sort({ createdAt: -1 }).lean();

    // build absolute host url from the request
    const host = `${req.protocol}://${req.get("host")}`;

    // attach full image URL when imageUrl is present
    const withFullUrl = items.map((i) => ({
      ...i,
      imageUrl: i.imageUrl ? host + i.imageUrl : "",
    }));

    return res.json(withFullUrl);
  } catch (error) {
    next(error);
  }
};

export const deleteItem = async (req, res, next) => {
  try {
    const removed = await itemModel.findByIdAndDelete(req.params.id);
    if (!removed) return res.status(404).json({ message: "Itme not found" });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};
