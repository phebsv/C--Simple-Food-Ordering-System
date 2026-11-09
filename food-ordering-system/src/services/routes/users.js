const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();
const { getCollection, setCollection } = require("../data/db");
const { requireAuth } = require("../middleware/auth");
const {
  LIMITS,
  sanitizeUser,
  cleanText,
  isValidPhone,
  isStrongPassword,
} = require("../data/helpers");

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

  const { name, phone, address } = req.body;
  if (name !== undefined) {
    const clean = cleanText(name, LIMITS.name);
    if (clean.length < 2) return res.status(400).json({ message: "Please enter your full name." });
    user.name = clean;
  }
  if (phone !== undefined) {
    const clean = cleanText(phone, LIMITS.phone);
    if (!isValidPhone(clean))
      return res.status(400).json({ message: "Please enter a valid mobile number." });
    user.phone = clean;
  }
  if (address !== undefined) user.address = cleanText(address, LIMITS.address);

  setCollection("users", users);
  return res.json(sanitizeUser(user));
});

// Change your own password. The current password must be given again.
router.post("/:id/password", requireAuth, (req, res) => {
  if (String(req.user.id) !== req.params.id)
    return res.status(403).json({ message: "You can only change your own password." });

  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword)
    return res.status(400).json({ message: "Current and new password are required." });

  const next = String(newPassword);
  if (!isStrongPassword(next))
    return res.status(400).json({
      message: "New password must be 8-100 characters with at least one letter and one number.",
    });

  const users = getCollection("users");
  const user = users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ message: "User not found." });

  if (!user.passwordHash || !bcrypt.compareSync(String(currentPassword), user.passwordHash))
    return res.status(400).json({ message: "Current password is incorrect." });
  if (bcrypt.compareSync(next, user.passwordHash))
    return res.status(400).json({ message: "New password must be different from the current one." });

  user.passwordHash = bcrypt.hashSync(next, 10);
  setCollection("users", users);
  return res.json({ message: "Password changed." });
});

module.exports = router;
