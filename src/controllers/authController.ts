 import { Request, Response } from "express";
import prisma from "../prisma";
import { hashPin, verifyPin } from "../utils/hashPin";
import { env } from "../utils/env";
import jwt from "jsonwebtoken";
import { transferMVZX } from "../services/tokenService";

export async function signup(req: Request, res: Response) {
  const { email, pin, ref } = req.body as { email?: string; pin: string; ref?: string };
  if (!pin || pin.length !== 4) return res.status(400).json({ error: "PIN must be 4 digits" });

  const pinHash = hashPin(pin);

  // Generate EVM wallet address for the user (off-chain; user controls via future KMS if needed)
  const { ethers } = await import("ethers");
  const wallet = ethers.Wallet.createRandom();

  // Link referrer if provided
  let referredById: number | undefined;
  if (ref) {
    const refUser = await prisma.user.findFirst({ where: { referralCode: ref } });
    if (refUser) referredById = refUser.id;
  }

  const user = await prisma.user.create({
    data: {
      email: email || null,
      pinHash,
      wallet: wallet.address,
      referredById
    }
  });

  // AIRDROP 0.5 MVZx
  await transferMVZX(user.wallet, 0.5);

  const token = jwt.sign({ id: user.id }, env.JWT_SECRET, { expiresIn: "7d" });
  res.json({ success: true, token, user: { id: user.id, wallet: user.wallet, referralCode: user.referralCode }, airdrop: 0.5 });
}

export async function login(req: Request, res: Response) {
  const { email, pin } = req.body as { email?: string; pin: string };
  const user = await prisma.user.findFirst({ where: { email: email || undefined } });
  if (!user) return res.status(404).json({ error: "User not found" });
  if (!verifyPin(pin, user.pinHash)) return res.status(401).json({ error: "Invalid PIN" });
  const token = jwt.sign({ id: user.id }, env.JWT_SECRET, { expiresIn: "7d" });
  res.json({ success: true, token });
}
