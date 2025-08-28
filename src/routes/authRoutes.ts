 import express from "express";
import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";

const prisma = new PrismaClient();
const router = express.Router();

// ✅ Signup route (with free 0.5 MVZx airdrop)
router.post("/signup", async (req, res) => {
  try {
    const { email, pin, referrerId } = req.body;

    if (!pin || pin.length !== 4) {
      return res.status(400).json({ error: "PIN must be 4 digits" });
    }

    // create wallet
    const walletAddress = uuidv4();

    // create user
    const newUser = await prisma.user.create({
      data: {
        email,
        pin,
        walletAddress,
        balance: 0.5, // free signup airdrop
        referrerId: referrerId || null,
      },
    });

    return res.json({
      success: true,
      message: "Signup successful. 0.5 MVZx airdrop credited.",
      user: newUser,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Signup failed" });
  }
});

export default router;
