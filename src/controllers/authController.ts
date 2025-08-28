 // backend/controllers/authController.ts
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma";
import { airdropMVZX } from "../services/airdropService";

const JWT_SECRET = process.env.JWT_SECRET || "changeme";

// ----------------- SIGNUP -----------------
export const signup = async (req: Request, res: Response) => {
  try {
    const { email, pin } = req.body;
    if (!email || !pin) {
      return res.status(400).json({ error: "Email and PIN are required" });
    }

    // Hash pin with salt
    const hashedPin = await bcrypt.hash(
      pin + (process.env.PIN_SALT || ""),
      10
    );

    // Create user in DB
    const user = await prisma.user.create({
      data: {
        email,
        pin: hashedPin,
      },
    });

    // Airdrop 0.5 MVZX on signup
    await airdropMVZX(user.id, "0.5");

    // Generate token
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "7d" });

    res.json({ token, user });
  } catch (err: any) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Signup failed" });
  }
};

// ----------------- LOGIN -----------------
export const login = async (req: Request, res: Response) => {
  try {
    const { email, pin } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) return res.status(400).json({ error: "Invalid credentials" });

    const match = await bcrypt.compare(
      pin + (process.env.PIN_SALT || ""),
      user.pin
    );
    if (!match) return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "7d" });

    res.json({ token, user });
  } catch (err: any) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
};

// ----------------- OPTIONAL: RETRY AIRDROPS -----------------
export const retryAirdrops = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany();
    for (const u of users) {
      await airdropMVZX(u.id, "0.5");
    }
    res.json({ success: true, count: users.length });
  } catch (err: any) {
    console.error("Retry airdrops error:", err);
    res.status(500).json({ error: "Retry airdrops failed" });
  }
};
