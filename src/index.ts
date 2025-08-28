 // src/index.ts
import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import { createWithdrawal, getWithdrawals } from "./controllers/withdrawController";

const app = express();
const prisma = new PrismaClient();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Root endpoint
app.get("/", (req: Request, res: Response) => {
  res.json({ message: "MVZx Backend API running" });
});

/* ---------------- WITHDRAWAL ROUTES ---------------- */
app.post("/withdrawals", createWithdrawal);
app.get("/withdrawals/:userId", getWithdrawals);

/* ---------------- HEALTH CHECK ---------------- */
app.get("/health", async (req: Request, res: Response) => {
  try {
    await prisma.$connect();
    res.json({ status: "ok", database: "connected" });
  } catch (err: any) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`MVZx backend server running on port ${PORT}`);
});
