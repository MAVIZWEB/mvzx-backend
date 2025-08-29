 import { Request, Response } from "express";
import { prisma } from "../prisma";
import { hashPin } from "../utils/hashPin";
import { transferMVZX } from "../services/tokenService";

export async function signup(req: Request, res: Response) {
  const { email, pin, referralId } = req.body;
  const pinHash = hashPin(pin, process.env.PIN_SALT!);

  // Generate wallet using ethers.js
  const { ethers } = await import("ethers");
  const provider = new ethers.JsonRpcProvider(process.env.BNB_RPC_URL);
  const wallet = ethers.Wallet.createRandom();
  const walletAddress = wallet.address;

  const user = await prisma.user.create({
    data: { email, pinHash, wallet: walletAddress, referralId }
  });

  // Send AIRDROP 0.5 MVZx
  await transferMVZX(walletAddress, 0.5);

  res.json({ success: true, wallet: walletAddress, airdrop: 0.5 });
}
