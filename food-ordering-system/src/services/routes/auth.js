const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();
const { getCollection, setCollection } = require("../data/db");
const { generateToken } = require("../middleware/auth");
const { newId, sanitizeUser, isAdmin, normalize } = require("../data/helpers");

function passwordMatches(user, password) {
  return Boolean(
    user?.passwordHash && bcrypt.compareSync(String(password), String(user.passwordHash)),
  );
}

// Admins may sign in with their username or email; customers with their email.
function findUserByLogin(users, loginId) {
  const id = normalize(loginId);
  return users.find(
    (u) =>
      normalize(u.email) === id || (isAdmin(u) && normalize(u.username) === id),
  );
}

function authResponse(res, user, message) {
  const admin = isAdmin(user);
  const token = generateToken(user.id, admin ? "admin" : "customer");
  return res.json({
    message,
    data: {
      token,
      user: { ...sanitizeUser(user), role: admin ? "admin" : "user", isAdmin: admin },
    },
  });
}

router.post("/register", (req, res) => {
  const { name, email, phone = "", password, address = "" } = req.body;

  if (!name || !email || !password)
    return res.status(400).json({ message: "Name, email, and password are required." });

  const users = getCollection("users");
  const normalizedEmail = normalize(email);
  if (users.some((u) => normalize(u.email) === normalizedEmail))
    return res.status(400).json({ message: "Email already registered." });

  const newUser = {
    id: newId(),
    name: String(name).trim(),
    email: normalizedEmail,
    phone,
    passwordHash: bcrypt.hashSync(String(password), 10),
    address,
    role: "user",
  };

  users.push(newUser);
  setCollection("users", users);

  res.status(201);
  return authResponse(res, newUser, "Account created successfully.");
});

router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ message: "Email and password are required." });

  const user = findUserByLogin(getCollection("users"), email);
  if (!passwordMatches(user, password))
    return res.status(401).json({ message: "Invalid email or password." });

  return authResponse(res, user, "Login successful.");
});

module.exports = router;
