 import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { createWallet } from "../services/tokenService";
import { hashPin } from "../lib/crypto";

export const signup = async (req: Request, res: Response) => {
  try {
    const { email, pin, referralId } = req.body;
    if (!email || !pin || pin.length !== 4) {
      return res.status(400).json({ error: "Email and 4-digit PIN required" });
    }

    const wallet = await createWallet();

    const hashedPin = hashPin(pin);

    const user = await prisma.user.create({
      data: {
        email,
        pin: hashedPin,
        wallet,
        referredBy: referralId,
      },
    });

    // Signup airdrop 0.5 MVZX
    await prisma.user.update({
      where: { id: user.id },
      data: { balance: { increment: 0.5 } },
    });

    res.json({ success: true, user });
  } catch (err: any) {
    console.error("Signup error:", err);
    res.status(500).json({ error: err.message });
  }
};
