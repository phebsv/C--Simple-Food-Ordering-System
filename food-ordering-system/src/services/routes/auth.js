const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();
const { getCollection, setCollection } = require("../data/db");
const { generateToken } = require("../middleware/auth");
const {
  LIMITS,
  newId,
  sanitizeUser,
  isAdmin,
  normalize,
  cleanText,
  isValidEmail,
  isValidPhone,
  isStrongPassword,
} = require("../data/helpers");

function passwordMatches(user, password) {
  return Boolean(
    user?.passwordHash && bcrypt.compareSync(String(password), String(user.passwordHash)),
  );
}

// Everyone (customers and admins) signs in with their email address.
function findUserByEmail(users, email) {
  const id = normalize(email);
  return users.find((u) => normalize(u.email) === id);
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
  const name = cleanText(req.body.name, LIMITS.name);
  const normalizedEmail = normalize(req.body.email);
  const phone = cleanText(req.body.phone, LIMITS.phone);
  const address = cleanText(req.body.address, LIMITS.address);
  const { password } = req.body;

  if (name.length < 2)
    return res.status(400).json({ message: "Please enter your full name." });
  if (!isValidEmail(normalizedEmail))
    return res.status(400).json({ message: "Please enter a valid email address." });
  if (phone && !isValidPhone(phone))
    return res.status(400).json({ message: "Please enter a valid mobile number." });
  if (!isStrongPassword(password))
    return res.status(400).json({
      message: "Password must be 8-100 characters with at least one letter and one number.",
    });

  const users = getCollection("users");
  if (users.some((u) => normalize(u.email) === normalizedEmail))
    return res.status(400).json({ message: "Email already registered." });

  const newUser = {
    id: newId(),
    name,
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

  const user = findUserByEmail(getCollection("users"), email);
  if (!passwordMatches(user, password))
    return res.status(401).json({ message: "Invalid email or password." });

  return authResponse(res, user, "Login successful.");
});

module.exports = router;
