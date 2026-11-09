// Small helpers shared by the route files.

// Maximum lengths for text the client can send.
const LIMITS = {
  name: 50,
  email: 100,
  phone: 20,
  address: 300,
  notes: 300,
  itemName: 80,
  description: 500,
  category: 30,
  url: 500,
  comment: 500,
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function newId(prefix = "") {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Never send password data to the client.
function sanitizeUser(user) {
  const { password, passwordHash, ...safe } = user;
  return safe;
}

function isAdmin(user) {
  return String(user?.role || "").toLowerCase() === "admin";
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

/**
 * Turn any input into clean text: a string, without control characters,
 * trimmed, and cut to `max` characters. null/undefined become "".
 */
function cleanText(value, max) {
  if (value === undefined || value === null) return "";
  return String(value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, max);
}

function isValidEmail(value) {
  return EMAIL_REGEX.test(value) && value.length <= LIMITS.email;
}

// Philippine mobile number: 09XXXXXXXXX or +63 9XXXXXXXXX (spaces/dashes ignored).
function isValidPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  const local = digits.startsWith("63") ? `0${digits.slice(2)}` : digits;
  return /^09\d{9}$/.test(local);
}

function isStrongPassword(value) {
  const p = String(value || "");
  return p.length >= 8 && p.length <= 100 && /[A-Za-z]/.test(p) && /\d/.test(p);
}

// Image links must be plain http(s) URLs (or empty). Returns null when invalid.
function cleanImageUrl(value) {
  const url = cleanText(value, LIMITS.url);
  return url === "" || /^https?:\/\/\S+$/i.test(url) ? url : null;
}

module.exports = {
  LIMITS,
  newId,
  sanitizeUser,
  isAdmin,
  normalize,
  cleanText,
  isValidEmail,
  isValidPhone,
  isStrongPassword,
  cleanImageUrl,
};
