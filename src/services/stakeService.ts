 import prisma from "../prisma";

export async function createStake(userId: number, amountMVZX: number) {
  const start = new Date();
  const end = new Date(start.getTime() + 150 * 24 * 60 * 60 * 1000);
  const stake = await prisma.stake.create({ data: { userId, amount: amountMVZX, endDate: end } });
  return stake;
}

export async function claimStake(stakeId: number, userId: number) {
  const stake = await prisma.stake.findUnique({ where: { id: stakeId } });
  if (!stake || stake.userId !== userId) throw new Error("Stake not found");
  if (stake.claimed) throw new Error("Already claimed");
  if (new Date() < stake.endDate) throw new Error("Not matured");
  const payout = Number(stake.amount) * 2; // 100% returns
  await prisma.user.update({ where: { id: userId }, data: { mvzxBalance: { increment: payout } } });
  await prisma.stake.update({ where: { id: stakeId }, data: { claimed: true } });
  return payout;
}
