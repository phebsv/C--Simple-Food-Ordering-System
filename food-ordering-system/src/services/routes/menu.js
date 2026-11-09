const express = require("express");
const router = express.Router();
const { getCollection, setCollection } = require("../data/db");
const { requireAdmin } = require("../middleware/auth");
const { LIMITS, newId, cleanText, cleanImageUrl } = require("../data/helpers");

// The menu is the single source of truth for stock; the admin "inventory"
// view is derived from it on the client.

router.get("/", (req, res) => {
  return res.json(getCollection("menu"));
});

router.get("/:id", (req, res) => {
  const item = getCollection("menu").find((i) => i.id === req.params.id);
  if (!item) return res.status(404).json({ message: "Menu item not found." });
  return res.json(item);
});

router.post("/", requireAdmin, (req, res) => {
  const name = cleanText(req.body.name, LIMITS.itemName);
  const description = cleanText(req.body.description, LIMITS.description);
  const category = cleanText(req.body.category, LIMITS.category);
  const image = cleanImageUrl(req.body.image);
  const { price, stock = 0 } = req.body;

  if (!name || !(Number(price) > 0) || !category)
    return res.status(400).json({ message: "name, a positive price, and category are required." });
  if (image === null)
    return res.status(400).json({ message: "Image must be an http(s) link." });

  const stockNumber = Math.max(0, Number(stock) || 0);
  const newItem = {
    id: newId(),
    name,
    description,
    price: Number(price),
    category,
    image,
    // An item with no stock can never be orderable.
    available: req.body.available !== false && stockNumber > 0,
    stock: stockNumber,
    lastUpdated: new Date().toISOString(),
  };

  const items = getCollection("menu");
  items.push(newItem);
  setCollection("menu", items);
  return res.status(201).json(newItem);
});

router.patch("/:id", requireAdmin, (req, res) => {
  const items = getCollection("menu");
  const item = items.find((i) => i.id === req.params.id);
  if (!item) return res.status(404).json({ message: "Menu item not found." });

  const { name, description, price, category, image, available, stock } = req.body;
  if (name !== undefined) {
    const clean = cleanText(name, LIMITS.itemName);
    if (!clean) return res.status(400).json({ message: "Name cannot be empty." });
    item.name = clean;
  }
  if (description !== undefined) item.description = cleanText(description, LIMITS.description);
  if (category !== undefined) {
    const clean = cleanText(category, LIMITS.category);
    if (!clean) return res.status(400).json({ message: "Category cannot be empty." });
    item.category = clean;
  }
  if (image !== undefined) {
    const clean = cleanImageUrl(image);
    if (clean === null) return res.status(400).json({ message: "Image must be an http(s) link." });
    item.image = clean;
  }
  if (price !== undefined) {
    if (!(Number(price) > 0))
      return res.status(400).json({ message: "Price must be a positive number." });
    item.price = Number(price);
  }
  if (stock !== undefined) {
    item.stock = Math.max(0, Number(stock) || 0);
    if (item.stock === 0) item.available = false;
  }
  if (available !== undefined) {
    if (available && Number(item.stock || 0) <= 0)
      return res.status(400).json({ message: "Out-of-stock items cannot be set to Available." });
    item.available = Boolean(available);
  }
  item.lastUpdated = new Date().toISOString();

  setCollection("menu", items);
  return res.json(item);
});

router.delete("/:id", requireAdmin, (req, res) => {
  const items = getCollection("menu");
  const filtered = items.filter((i) => i.id !== req.params.id);
  if (filtered.length === items.length)
    return res.status(404).json({ message: "Menu item not found." });

  setCollection("menu", filtered);
  return res.json({ message: "Menu item deleted." });
});

module.exports = router;
