 import { Response } from "express";
import prisma from "../prisma";
import { AuthedRequest } from "../middlewares/authMiddleware";
import { env, MVZX_USDT_RATE, NGN_PER_USDT, SLOT_COST } from "../utils/env";
import { creditLegsAndMaybeAdvance } from "../services/matrixService";
import { transferMVZX } from "../services/tokenService";
import { flwInitializeNGN, flwVerify } from "../services/flwService";

function mvzxForNaira(naira: number) {
  const usdt = naira / NGN_PER_USDT; // NGN→USDT
  const mvzx = usdt / MVZX_USDT_RATE; // USDT→MVZX (USDT per MVZX)
  return mvzx;
}

/**
 * amountNGN: for FLW/BANK
 * amountUSDT: for on-chain USDT purchases
 */
export async function initFlutterwave(req: AuthedRequest, res: Response) {
  const { amountNGN } = req.body as { amountNGN: number };
  if (amountNGN < 200) return res.status(400).json({ error: "Minimum 200 NGN" });
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) return res.status(404).json({ error: "User not found" });
  const txRef = `FLW_${req.user!.id}_${Date.now()}`;
  const data = await flwInitializeNGN(amountNGN, user.email || "user@mvzx.app", txRef);
  res.json({ success: true, init: data });
}

export async function verifyFlutterwave(req: AuthedRequest, res: Response) {
  const { txId } = req.body as { txId: string };
  const data = await flwVerify(txId);
  const amountNGN = Number(data?.data?.amount || 0);
  if (!amountNGN || amountNGN <= 0) return res.status(400).json({ error: "Invalid payment" });

  await handlePostPurchase(req.user!.id, amountNGN, "FLW");
  res.json({ success: true });
}

export async function bankDeposit(req: AuthedRequest, res: Response) {
  const { amountNGN } = req.body as { amountNGN: number };
  if (amountNGN < 200) return res.status(400).json({ error: "Minimum 200 NGN" });
  // Create a placeholder purchase; admin will approve in back-office (not included here)
  await handlePostPurchase(req.user!.id, amountNGN, "BANK", true);
  res.json({ success: true, note: "Bank deposit pending admin approval" });
}

export async function usdtPurchase(req: AuthedRequest, res: Response) {
  const { amountUSDT } = req.body as { amountUSDT: number };
  const amountNGN = amountUSDT * NGN_PER_USDT;
  await handlePostPurchase(req.user!.id, amountNGN, "USDT");
  res.json({ success: true });
}

async function handlePostPurchase(userId: number, amountNGN: number, method: "USDT"|"FLW"|"BANK", pending = false) {
  const matrixEligible = amountNGN >= SLOT_COST && amountNGN % SLOT_COST === 0;
  const tokensMVZX = mvzxForNaira(amountNGN);

  const purchase = await prisma.purchase.create({
    data: {
      userId,
      amountNGN,
      amountUSDT: amountNGN / NGN_PER_USDT,
      tokensMVZX,
      method,
      matrixEligible
    }
  });

  // Transfer tokens to user's wallet (on-chain) and increment internal balance mirror
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user) {
    await transferMVZX(user.wallet, tokensMVZX);
    await prisma.user.update({ where: { id: userId }, data: { mvzxBalance: { increment: tokensMVZX } } });
  }

  // Referral/Buyer bonus for non-multiples of 2000 NGN
  if (!matrixEligible) {
    const buyerBonus = amountNGN * 0.025;
    await prisma.user.update({ where: { id: userId }, data: { mvzxBalance: { increment: buyerBonus } } });
    if (user?.referredById) {
      await prisma.user.update({ where: { id: user.referredById }, data: { mvzxBalance: { increment: amountNGN * 0.025 } } });
    }
    return purchase;
  }

  // Matrix leg credits for each eligible unit (each 2000 NGN chunk)
  const units = Math.floor(amountNGN / SLOT_COST);
  for (let i = 0; i < units; i++) {
    await creditLegsAndMaybeAdvance(userId, SLOT_COST);
  }
  return purchase;
}
