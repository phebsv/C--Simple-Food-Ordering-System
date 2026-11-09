const express = require("express");
const router = express.Router();
const { getCollection, setCollection } = require("../data/db");
const { requireAuth } = require("../middleware/auth");
const { newId } = require("../data/helpers");

// Every route works on the logged-in customer's own cart only.
router.use(requireAuth);

const ownItems = (req) =>
  getCollection("cart_items").filter((i) => String(i.customerId) === String(req.user.id));

router.get("/", (req, res) => {
  return res.json(ownItems(req));
});

// Add one of a menu item, or increase its quantity if it is already in the cart.
router.post("/", (req, res) => {
  const { menuId, quantity = 1 } = req.body;
  const menuItem = getCollection("menu").find((m) => String(m.id) === String(menuId));
  if (!menuItem) return res.status(400).json({ message: "Menu item not found." });

  const items = getCollection("cart_items");
  let item = items.find(
    (i) => String(i.customerId) === String(req.user.id) && i.menuId === String(menuId),
  );

  if (item) {
    item.quantity += Math.max(1, Number(quantity) || 1);
  } else {
    item = {
      id: newId(),
      customerId: String(req.user.id),
      menuId: String(menuId),
      name: menuItem.name,
      description: menuItem.description || "",
      price: Number(menuItem.price),
      category: menuItem.category || "",
      image: menuItem.image || "",
      quantity: Math.max(1, Number(quantity) || 1),
    };
    items.push(item);
  }

  setCollection("cart_items", items);
  return res.status(201).json(item);
});

router.patch("/:id", (req, res) => {
  const items = getCollection("cart_items");
  const item = items.find((i) => i.id === req.params.id && String(i.customerId) === String(req.user.id));
  if (!item) return res.status(404).json({ message: "Cart item not found." });

  const quantity = Math.floor(Number(req.body.quantity));
  if (!(quantity > 0)) return res.status(400).json({ message: "Quantity must be at least 1." });

  item.quantity = quantity;
  setCollection("cart_items", items);
  return res.json(item);
});

// DELETE /cart_items/:id removes one line; DELETE /cart_items empties the cart.
router.delete("/:id", (req, res) => {
  const items = getCollection("cart_items");
  const remaining = items.filter(
    (i) => !(i.id === req.params.id && String(i.customerId) === String(req.user.id)),
  );
  if (remaining.length === items.length)
    return res.status(404).json({ message: "Cart item not found." });

  setCollection("cart_items", remaining);
  return res.json({ message: "Cart item removed." });
});

router.delete("/", (req, res) => {
  const remaining = getCollection("cart_items").filter(
    (i) => String(i.customerId) !== String(req.user.id),
  );
  setCollection("cart_items", remaining);
  return res.json({ message: "Cart cleared." });
});

module.exports = router;
