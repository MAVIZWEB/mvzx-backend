 // backend/controllers/authController.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Request, Response } from "express";
import { generateWalletAddress } from "../utils/walletUtils";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

// ------------------------
// Signup with auto wallet + airdrop
// ------------------------
export const signup = async (req: Request, res: Response) => {
  try {
    const { email, pin } = req.body;

    if (!email || !pin) {
      return res.status(400).json({ error: "Email and PIN are required" });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    // Hash PIN
    const hashedPin = await bcrypt.hash(pin, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        pin: hashedPin,
      },
    });

    // Generate wallet address
    const walletAddress = generateWalletAddress();

    // Create wallet + airdrop 0.5 MVZX
    const wallet = await prisma.wallet.create({
      data: {
        userId: user.id,
        address: walletAddress,
        balance: 0.5, // airdrop
      },
    });

    return res.status(201).json({
      message: "Signup successful",
      userId: user.id,
      wallet: { address: wallet.address, balance: wallet.balance },
    });
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ------------------------
// Login
// ------------------------
export const login = async (req: Request, res: Response) => {
  try {
    const { email, pin } = req.body;

    if (!email || !pin) {
      return res.status(400).json({ error: "Email and PIN are required" });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { wallet: true },
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid email or PIN" });
    }

    const isMatch = await bcrypt.compare(pin, user.pin);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid email or PIN" });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });

    return res.status(200).json({
      message: "Login successful",
      token,
      wallet: user.wallet
        ? { address: user.wallet.address, balance: user.wallet.balance }
        : null,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
