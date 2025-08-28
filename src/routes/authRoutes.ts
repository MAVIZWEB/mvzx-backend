 import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();
const router = Router();

// --- SIGNUP ---
// User signs up with PIN, gets auto-wallet, and free 0.5 MVZx airdrop
router.post("/signup", async (req, res) => {
  try {
    const { email, pin, referralCode } = req.body;
    if (!pin || pin.length !== 4) {
      return res.status(400).json({ error: "PIN must be 4 digits" });
    }

    // Auto wallet address assignment (random for demo)
    const walletAddress = "MVZx_" + randomBytes(8).toString("hex");

    const newUser = await prisma.user.create({
      data: {
        email,
        pin,
        referralCode,
        walletAddress,
        balance: 0.5, // airdrop
      },
    });

    res.json({ success: true, user: newUser });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- LOGIN (using email + PIN) ---
router.post("/login", async (req, res) => {
  try {
    const { email, pin } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.pin !== pin) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    res.json({ success: true, user });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
