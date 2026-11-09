const express = require("express");
const router = express.Router();
const { getCollection, setCollection } = require("../data/db");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { newId } = require("../data/helpers");

router.get("/", requireAuth, (req, res) => {
  return res.json(getCollection("reviews"));
});

// A customer can review each item of their own delivered orders once.
router.post("/", requireAuth, (req, res) => {
  const { orderId, foodItemId, rating, comment = "" } = req.body;
  const ratingNumber = Number(rating);

  if (!orderId || !foodItemId)
    return res.status(400).json({ message: "orderId and foodItemId are required." });
  if (!Number.isInteger(ratingNumber) || ratingNumber < 1 || ratingNumber > 5)
    return res.status(400).json({ message: "Rating must be a whole number from 1 to 5." });

  const order = getCollection("orders").find((o) => o.id === orderId);
  if (!order || String(order.customerId) !== String(req.user.id))
    return res.status(404).json({ message: "Order not found." });
  if (order.status !== "Delivered")
    return res.status(400).json({ message: "You can only review delivered orders." });

  const item = (order.items || []).find((i) => String(i.id) === String(foodItemId));
  if (!item) return res.status(400).json({ message: "That item is not part of this order." });

  const reviews = getCollection("reviews");
  if (reviews.some((r) => r.orderId === orderId && String(r.foodItemId) === String(foodItemId)))
    return res.status(400).json({ message: "You already reviewed this item." });

  const newReview = {
    id: newId("review"),
    orderId,
    customerId: String(req.user.id),
    customerName: order.customerName || "Customer",
    foodItemId: String(item.id),
    foodItemName: item.name,
    rating: ratingNumber,
    comment: String(comment).trim().slice(0, 500),
    createdAt: new Date().toISOString(),
    hidden: false,
  };

  reviews.push(newReview);
  setCollection("reviews", reviews);
  return res.status(201).json(newReview);
});

router.delete("/:id", requireAdmin, (req, res) => {
  const reviews = getCollection("reviews");
  const filtered = reviews.filter((r) => r.id !== req.params.id);
  if (filtered.length === reviews.length)
    return res.status(404).json({ message: "Review not found." });

  setCollection("reviews", filtered);
  return res.json({ message: "Review deleted." });
});

module.exports = router;
