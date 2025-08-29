 import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Root health route (fixes Cannot GET /)
app.get("/", (req: Request, res: Response) => {
  res.json({
    status: "✅ Backend is running",
    service: "MVZX API",
    timestamp: new Date().toISOString(),
  });
});

// API Routes
import authRoutes from "./routes/auth";
import purchaseRoutes from "./routes/purchase";
import stakeRoutes from "./routes/stake";
import withdrawRoutes from "./routes/withdraw";
import referralRoutes from "./routes/referral";

app.use("/api/auth", authRoutes);
app.use("/api/purchase", purchaseRoutes);
app.use("/api/stake", stakeRoutes);
app.use("/api/withdraw", withdrawRoutes);
app.use("/api/referral", referralRoutes);

// 404 handler for unknown routes
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: "Route not found" });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("❌ Backend error:", err.stack);
  res.status(500).json({ error: "Something broke on the server" });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});
