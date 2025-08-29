 // backend/src/index.ts
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth";
import stakeRoutes from "./routes/stake";
import purchaseRoutes from "./routes/purchase";
import adminRoutes from "./routes/admin";

dotenv.config();

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || process.env.FRONTEND_URL || "*" }));
app.use(express.json());

app.get("/", (_, res) => res.json({ status: "ok", now: new Date().toISOString() }));

app.use("/api/auth", authRoutes);
app.use("/api/stake", stakeRoutes);
app.use("/api/purchase", purchaseRoutes);
app.use("/api/admin", adminRoutes);

// 404
app.use((_, res) => res.status(404).json({ error: "Not Found" }));

const PORT = Number(process.env.PORT || 10000);
app.listen(PORT, () => {
  console.log(`MVZX Backend listening on port ${PORT}`);
});
