 import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

/* ---------------- REGISTER ---------------- */
export const register = async (req: Request, res: Response) => {
  try {
    const { email, pin } = req.body;

    if (!email || !pin) {
      return res.status(400).json({ error: "Email and PIN are required" });
    }

    const hashedPin = await bcrypt.hash(pin, 10);

    const user = await prisma.user.create({
      data: { email, pin: hashedPin },
    });

    const wallet = await prisma.wallet.create({
      data: {
        userId: user.id,
        balance: 0.5, // Airdrop
        address: `WALLET-${user.id}-${Date.now()}`,
      },
    });

    res.json({ user, wallet });
  } catch (err: any) {
    res.status(500).json({ error: "Registration failed", details: err.message });
  }
};

/* ---------------- LOGIN ---------------- */
export const login = async (req: Request, res: Response) => {
  try {
    const { email, pin } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const valid = await bcrypt.compare(pin, user.pin);
    if (!valid) return res.status(401).json({ error: "Invalid PIN" });

    res.json({ message: "Login successful", userId: user.id });
  } catch (err: any) {
    res.status(500).json({ error: "Login failed", details: err.message });
  }
};
