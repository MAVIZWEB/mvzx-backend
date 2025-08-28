// src/services/walletService.ts
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

/**
 * Create wallet for new user and airdrop 0.5 MVZx
 */
export async function createWalletForUser(userId: number) {
  const walletAddress = "0x" + randomBytes(20).toString("hex");

  const wallet = await prisma.wallet.create({
    data: {
      userId,
      address: walletAddress,
      balance: 0.5 // Airdrop reward
    }
  });

  return wallet;
}
