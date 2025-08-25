 import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// Import all routes
import authRoutes from "./routes/auth";
import miningRoutes from "./routes/mining";
import airdropRoutes from "./routes/airdrop";
import votingRoutes from "./routes/voting";
import escrowRoutes from "./routes/escrow";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/auth", authRoutes);       // Signup, login, admin creation
app.use("/mining", miningRoutes);   // Mining endpoint
app.use("/airdrop", airdropRoutes); // Claim airdrop
app.use("/voting", votingRoutes);   // Voting endpoints
app.use("/escrow", escrowRoutes);   // Escrow P2P offers

// Health check
app.get("/", (_req, res) => {
  res.send("✅ MVZx Backend running (In-memory) 🚀");
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
