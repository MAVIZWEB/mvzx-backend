 import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs"; // switched to bcryptjs
import jwt from "jsonwebtoken";
import { Request, Response } from "express";
import { generateWalletAddress } from "../utils/walletUtils"; // utility to generate wallet address

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

// Signup with auto wallet + airdrop
export const signup = async (req: Request, res: Response) => {
  try {
    const { email, pin } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hashedPin = await bcrypt.hash(pin, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        pin: hashedPin,
      },
    });

    // Generate wallet
    const walletAddress = generateWalletAddress();
    await prisma.wallet.create({
      data: {
        userId: user.id,
        address: walletAddress,
        balance: 0.5, // Airdrop 0.5 MVZX
      },
    });

    return res.status(201).json({ message: "Signup successful", userId: user.id });
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Login
export const login = async (req: Request, res: Response) => {
  try {
    const { email, pin } = req.body;

    const user = await prisma.user.findUnique({ where: { email }, include: { wallet: true } });
    if (!user) {
      return res.status(400).json({ error: "Invalid email or PIN" });
    }

    const isMatch = await bcrypt.compare(pin, user.pin);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid email or PIN" });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });

    return res.status(200).json({ message: "Login successful", token, wallet: user.wallet });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
