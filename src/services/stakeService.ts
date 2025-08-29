import { prisma } from "../prisma";

export async function createStake(userId: number, amount: number) {
  const start = new Date();
  const end = new Date(start.getTime() + 150 * 24 * 60 * 60 * 1000); // 150 days
  const stake = await prisma.stake.create({ data: { userId, amount, startDate: start, endDate: end } });
  return stake;
}

export async function claimStake(stakeId: number, userId: number) {
  const stake = await prisma.stake.findUnique({ where: { id: stakeId } });
  if (!stake || stake.claimed || stake.userId !== userId) throw new Error("Cannot claim");
  if (new Date() < stake.endDate) throw new Error("Stake not matured");
  
  const payout = stake.amount * 2; // 100% returns
  await prisma.user.update({ where: { id: userId }, data: { balance: { increment: payout } } });
  await prisma.stake.update({ where: { id: stakeId }, data: { claimed: true } });
  return payout;
}
