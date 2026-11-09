const express = require("express");
const router = express.Router();
const { getCollection, setCollection } = require("../data/db");
const { requireAuth } = require("../middleware/auth");
const { sanitizeUser } = require("../data/helpers");

// A customer may only read or edit their own profile; admins may access any.
function requireSelfOrAdmin(req, res, next) {
  if (req.user.role === "admin" || String(req.user.id) === req.params.id) return next();
  return res.status(403).json({ message: "Forbidden." });
}

router.get("/:id", requireAuth, requireSelfOrAdmin, (req, res) => {
  const user = getCollection("users").find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ message: "User not found." });
  return res.json(sanitizeUser(user));
});

router.patch("/:id", requireAuth, requireSelfOrAdmin, (req, res) => {
  const users = getCollection("users");
  const user = users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ message: "User not found." });

  for (const field of ["name", "phone", "address"]) {
    if (req.body[field] !== undefined) user[field] = String(req.body[field]).trim();
  }

  setCollection("users", users);
  return res.json(sanitizeUser(user));
});

module.exports = router;
