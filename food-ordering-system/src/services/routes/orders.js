const express = require("express");
const router = express.Router();
const { getCollection, setCollection } = require("../data/db");
const { requireAuth } = require("../middleware/auth");
const { newId } = require("../data/helpers");

const ORDER_STATUSES = ["Pending", "Preparing", "Ready", "Delivered", "Cancelled"];
const CUSTOMER_CANCELLABLE = ["Pending", "Preparing"];

const isAdminRequest = (req) => req.user?.role === "admin";
const ownsOrder = (req, order) => String(order.customerId) === String(req.user?.id);

// Add (positive) or remove (negative) stock for each ordered item.
function adjustStock(orderItems, direction) {
  const menu = getCollection("menu");
  const now = new Date().toISOString();

  for (const ordered of orderItems) {
    const menuItem = menu.find((m) => String(m.id) === String(ordered.id));
    if (!menuItem) continue;
    menuItem.stock = Math.max(0, Number(menuItem.stock || 0) + direction * ordered.quantity);
    menuItem.available = menuItem.stock > 0;
    menuItem.lastUpdated = now;
  }

  setCollection("menu", menu);
}

router.get("/", requireAuth, (req, res) => {
  const orders = getCollection("orders");
  // Customers only ever see their own orders.
  return res.json(isAdminRequest(req) ? orders : orders.filter((o) => ownsOrder(req, o)));
});

router.get("/:id", requireAuth, (req, res) => {
  const order = getCollection("orders").find((o) => o.id === req.params.id);
  if (!order || (!isAdminRequest(req) && !ownsOrder(req, order)))
    return res.status(404).json({ message: "Order not found." });
  return res.json(order);
});

router.post("/", requireAuth, (req, res) => {
  const {
    customerName = "",
    customerEmail = "",
    customerPhone = "",
    customerAddress = "",
    items,
    paymentMethod = "cash",
    deliveryNotes = "",
  } = req.body;

  if (!Array.isArray(items) || items.length === 0)
    return res.status(400).json({ message: "An order needs at least one item." });

  // Prices and stock come from the menu, never from the client.
  const menu = getCollection("menu");
  const orderItems = [];
  for (const requested of items) {
    const quantity = Math.floor(Number(requested?.quantity));
    const menuItem = menu.find((m) => String(m.id) === String(requested?.id));

    if (!menuItem || !(quantity > 0))
      return res.status(400).json({ message: "One of the items is no longer on the menu." });
    if (menuItem.available === false || Number(menuItem.stock || 0) < quantity)
      return res
        .status(400)
        .json({ message: `Sorry, only ${menuItem.stock || 0} ${menuItem.name} left in stock.` });

    orderItems.push({
      id: menuItem.id,
      name: menuItem.name,
      description: menuItem.description || "",
      price: Number(menuItem.price),
      category: menuItem.category || "",
      quantity,
    });
  }

  const total = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const now = new Date().toISOString();
  const newOrder = {
    id: newId("order"),
    customerId: String(req.user.id),
    customerName,
    customerEmail,
    customerPhone,
    customerAddress,
    items: orderItems,
    subtotal: total,
    total,
    status: "Pending",
    paymentMethod,
    deliveryNotes,
    createdAt: now,
    updatedAt: now,
  };

  const orders = getCollection("orders");
  orders.push(newOrder);
  setCollection("orders", orders);
  adjustStock(orderItems, -1);

  return res.status(201).json(newOrder);
});

router.patch("/:id", requireAuth, (req, res) => {
  const orders = getCollection("orders");
  const order = orders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ message: "Order not found." });

  const nextStatus = req.body.status;
  if (!ORDER_STATUSES.includes(nextStatus))
    return res.status(400).json({ message: `Status must be one of: ${ORDER_STATUSES.join(", ")}.` });

  const canCustomerCancel =
    ownsOrder(req, order) &&
    nextStatus === "Cancelled" &&
    CUSTOMER_CANCELLABLE.includes(order.status);

  if (!isAdminRequest(req) && !canCustomerCancel)
    return res.status(403).json({ message: "Forbidden." });

  if (order.status === "Cancelled" && nextStatus !== "Cancelled")
    return res.status(400).json({ message: "A cancelled order cannot be reopened." });

  // Put the stock back when an order is cancelled.
  if (nextStatus === "Cancelled" && order.status !== "Cancelled") {
    adjustStock(order.items || [], +1);
  }

  order.status = nextStatus;
  order.updatedAt = new Date().toISOString();
  setCollection("orders", orders);
  return res.json(order);
});

module.exports = router;
