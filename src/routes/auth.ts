 // src/routes/auth.ts
import { Router } from "express";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const router = Router();

router.post("/register", async (req, res) => {
  const { email, wallet } = req.body;
  if (!email || !wallet) return res.status(400).json({ error: "email & wallet required" });
  const user = await prisma.user.upsert({ where: { email }, create: { email, wallet }, update: { wallet } });
  const token = jwt.sign({ uid: user.id }, process.env.JWT_SECRET!, { expiresIn: "14d" });
  res.json({ token, user:{ id:user.id, email:user.email, wallet:user.wallet } });
});

router.post("/login", async (req,res) => {
  const { email, wallet } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.wallet.toLowerCase() !== String(wallet).toLowerCase()) return res.status(400).json({ error:"invalid" });
  const token = jwt.sign({ uid: user.id }, process.env.JWT_SECRET!, { expiresIn: "14d" });
  res.json({ token, user:{ id:user.id, email:user.email, wallet:user.wallet } });
});

export default router;
