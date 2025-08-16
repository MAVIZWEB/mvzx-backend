import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

import authRoutes from "./routes/auth";
import matrixRoutes from "./routes/matrix";
import walletRoutes from "./routes/wallet";

dotenv.config();
const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "MVZx Backend Running ✅" });
});

app.use("/auth", authRoutes);
app.use("/matrix", matrixRoutes);
app.use("/wallet", walletRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
