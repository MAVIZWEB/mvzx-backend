 // src/server.ts

import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";

// Route imports
import auth from "./routes/auth";
import payments from "./routes/payments";
import matrix from "./routes/matrix";
import wallet from "./routes/wallet";
import game from "./routes/game";
import pub from "./routes/public";

const app = express();

// Middlewares
app.use(
  cors({
    origin: process.env.FRONT_ORIGIN || "*", // allow frontend origin or fallback
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));

// Routes
app.use("/auth", auth);
app.use("/payments", payments);
app.use("/matrix", matrix);
app.use("/wallet", wallet);
app.use("/game", game);
app.use("/public", pub);

// Root check
app.get("/", (_req, res) => res.send("✅ MVZx Backend is running"));

// Boot server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 API running on port ${PORT} [LIVE=${process.env.LIVE}]`);
});
