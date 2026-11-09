const express = require("express");
const cors = require("cors");
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use("/auth", require("./routes/auth"));
app.use("/users", require("./routes/users"));
app.use("/menu", require("./routes/menu"));
app.use("/orders", require("./routes/orders"));
app.use("/reviews", require("./routes/reviews"));
app.use("/cart_items", require("./routes/cart_items"));

app.get("/", (req, res) => {
  res.json({ message: "NomNom API is running.", port: PORT });
});

app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.path} not found.` });
});

// Return JSON instead of an HTML stack trace for unexpected errors.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || "Something went wrong." });
});

app.listen(PORT, () => {
  console.log(`NomNom backend running on http://localhost:${PORT}`);
});
