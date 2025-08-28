 import { prisma } from "../lib/prisma";
import { assignPositionAndDistribute } from "./matrixService";

export async function handlePurchase(userId: number, amount: number) {
  if (amount < 200) {
    throw new Error("Minimum purchase is 200 NGN");
  }

  const isMatrix = amount % 2000 === 0 && amount >= 2000;
  const tokensToCredit = amount; // 1 Naira = 1 MVZx (example)

  await prisma.wallet.update({
    where: { userId },
    data: { balance: { increment: tokensToCredit } },
  });

  let matrixResult = null;
  if (isMatrix) {
    matrixResult = await assignPositionAndDistribute(userId, 2000);
  }

  return { tokensToCredit, matrixResult, isMatrix };
}
