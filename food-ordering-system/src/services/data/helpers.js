// Small helpers shared by the route files.

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

module.exports = {
  newId,
  sanitizeUser,
  isAdmin,
  normalize,
};
