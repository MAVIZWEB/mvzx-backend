 import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import games from "./routes/games"; // ✅ use plural name

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use("/games", games); // endpoint: POST /games/spin

// Health check route
app.get("/", (_req, res) => {
  res.send("MVZx backend is running 🚀");
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
