 import { Router } from "express";
import { prisma } from "../prisma/client"; // ensure prisma client is exported
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";

const router = Router();

// Signup new user
router.post("/signup", async (req, res) => {
  try {
    const { email, pin, confirmPin } = req.body;

    if (!email || !pin || !confirmPin) {
      return res.status(400).json({ error: "All fields are required." });
    }

    if (pin !== confirmPin) {
      return res.status(400).json({ error: "PINs do not match." });
    }

    // Check if email exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: "Email already registered." });
    }

    // Hash PIN
    const hashedPin = await bcrypt.hash(pin, 10);

    // Assign a random wallet address (simulate here; later can integrate blockchain)
    const walletAddress = "0x" + nanoid(40); // 0x + 40 chars

    const user = await prisma.user.create({
      data: {
        email,
        pin: hashedPin,
        walletAddress,
        isAdmin: false, // default
      },
    });

    return res.status(201).json({
      message: "Signup successful!",
      walletAddress: user.walletAddress,
      email: user.email,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Admin creation route (for first setup only)
router.post("/create-admin", async (req, res) => {
  try {
    const { email, pin, confirmPin } = req.body;

    if (!email || !pin || !confirmPin) {
      return res.status(400).json({ error: "All fields are required." });
    }

    if (pin !== confirmPin) {
      return res.status(400).json({ error: "PINs do not match." });
    }

    const hashedPin = await bcrypt.hash(pin, 10);
    const walletAddress = "0x" + nanoid(40);

    const admin = await prisma.user.create({
      data: {
        email,
        pin: hashedPin,
        walletAddress,
        isAdmin: true,
      },
    });

    return res.status(201).json({
      message: "Admin created successfully!",
      walletAddress: admin.walletAddress,
      email: admin.email,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
