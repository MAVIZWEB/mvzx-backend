 import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

import authRoutes from "./routes/auth";
import purchaseRoutes from "./routes/purchase";
import stakeRoutes from "./routes/stake";
import withdrawRoutes from "./routes/withdraw";
import referralRoutes from "./routes/referral";

dotenv.config();
const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// Routes
app.use("/auth", authRoutes);
app.use("/purchase", purchaseRoutes);
app.use("/stake", stakeRoutes);
app.use("/withdraw", withdrawRoutes);
app.use("/referral", referralRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
