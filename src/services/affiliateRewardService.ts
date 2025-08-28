// src/services/affiliateRewardService.ts
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

/**
 * Process affiliate-only purchase
 * - 2.5% to buyer (referral bonus)
 * - 2.5% to referrer (upline)
 * - MVZx tokens sent to buyer wallet
 */
export async function processAffiliateReward(userId: number, amount: number) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  // Referral reward split
  const referralBonus = amount * 0.025;
  const referrerBonus = amount * 0.025;

  // Credit buyer (referral bonus in MVZx tokens)
  await prisma.wallet.update({
    where: { userId },
    data: { balance: { increment: referralBonus } }
  });

  // Credit referrer if exists
  if (user.referredBy) {
    await prisma.wallet.update({
      where: { userId: user.referredBy },
      data: { balance: { increment: referrerBonus } }
    });
  }

  // Credit purchase amount in MVZx tokens to buyer wallet
  await prisma.wallet.update({
    where: { userId },
    data: { balance: { increment: amount } }
  });

  return {
    success: true,
    referralBonus,
    referrerBonus,
    tokensCredited: amount
  };
}
