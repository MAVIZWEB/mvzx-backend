import { Router } from "express";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { ethers } from "ethers";

const router = Router();
const prisma = new PrismaClient();

// Signup
router.post("/signup", async (req, res) => {
  try {
    const { email, pin, confirmPin } = req.body;

    if (!email || !pin || !confirmPin)
      return res.status(400).json({ error: "All fields are required" });

    if (pin !== confirmPin)
      return res.status(400).json({ error: "PINs do not match" });

    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing)
      return res.status(400).json({ error: "Email already registered" });

    // Hash PIN
    const hashedPin = await bcrypt.hash(pin, 10);

    // Generate wallet address
    const wallet = ethers.Wallet.createRandom().address;

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        pin: hashedPin,
        wallet,
        balance: 0,
        freeSpins: 3,
      },
    });

    return res.json({
      id: user.id,
      email: user.email,
      wallet: user.wallet,
      balance: user.balance,
      freeSpins: user.freeSpins,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, pin } = req.body;
    if (!email || !pin)
      return res.status(400).json({ error: "Email and PIN are required" });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ error: "Invalid credentials" });

    const isValid = await bcrypt.compare(pin, user.pin);
    if (!isValid) return res.status(400).json({ error: "Invalid credentials" });

    return res.json({
      id: user.id,
      email: user.email,
      wallet: user.wallet,
      balance: user.balance,
      freeSpins: user.freeSpins,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// Buy MVZx
router.post("/buy", async (req, res) => {
  try {
    const { userId, amount } = req.body;
    if (!userId || !amount)
      return res.status(400).json({ error: "userId and amount required" });

    const user = await prisma.user.update({
      where: { id: userId },
      data: { balance: { increment: amount } },
    });

    return res.json({ balance: user.balance });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
