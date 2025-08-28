 // src/controllers/authController.ts
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { createWalletForUser } from "../services/walletService";

const prisma = new PrismaClient();

/**
 * User Signup
 * - 4 digit PIN is mandatory
 * - Email optional (for recovery)
 * - Wallet auto-created & credited with 0.5 MVZx
 */
export async function signup(req: Request, res: Response) {
  try {
    const { pin, email, referredBy } = req.body;

    if (!pin || pin.toString().length !== 4) {
      return res.status(400).json({ success: false, message: "4-digit PIN required" });
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        pin: pin.toString(),
        email: email || null,
        referredBy: referredBy || null
      }
    });

    // Create wallet & airdrop
    const wallet = await createWalletForUser(user.id);

    return res.json({
      success: true,
      message: "Signup successful. Wallet created with 0.5 MVZx airdrop.",
      user,
      wallet
    });
  } catch (err: any) {
    console.error("Signup error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}
