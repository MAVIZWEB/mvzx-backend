 import express from "express";
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();
const router = express.Router();

// Signup
router.post("/signup", async (req, res) => {
  try {
    const { pin, email, referrerId } = req.body;
    if (!pin || pin.length !== 4) {
      return res.status(400).json({ error: "PIN must be 4 digits" });
    }

    const address = "MVZx_" + randomBytes(8).toString("hex");
    const user = await prisma.user.create({
      data: {
        email,
        pin,
        wallet: { create: { address, balance: 0.5 } }, // free 0.5 airdrop
      },
      include: { wallet: true },
    });

    // handle referral link if any
    if (referrerId) {
      await prisma.referral.create({
        data: { userId: user.id, referrerId, commission: 0 },
      });
    }

    res.json({ success: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Signup failed" });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { pin, email } = req.body;
    const user = await prisma.user.findUnique({
      where: { email },
      include: { wallet: true },
    });

    if (!user || user.pin !== pin) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
});

export default router;
