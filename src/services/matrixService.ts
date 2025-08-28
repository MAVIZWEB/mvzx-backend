 // backend/services/matrixService.ts
import prisma from "../lib/prisma";

const P = {
  MC: 0.15,  // Matrix Completion
  JB: 0.10,  // Joining Bonus (stage 1 only)
  NSP: 0.35, // Next Stage Position
  CR: 0.20,  // Cash Reward / Referral
  LP: 0.10,  // Leg Pool
  CP: 0.10,  // Company Pool
};

export async function assignPositionAndDistribute(userId: number, matrixBase: number) {
  // Get latest matrix stage for user
  let cur = await prisma.matrix.findFirst({
    where: { userId },
    orderBy: { stage: "desc" },
  });

  // If user has no matrix yet → create Stage 1
  if (!cur) {
    cur = await prisma.matrix.create({
      data: { userId, stage: 1, position: 0, earnings: 0 },
    });
  }

  const stage = cur.stage;

  // Stage-based adjustments
  const jbPct = stage === 1 ? P.JB : 0;
  const lpPct = stage === 1 ? P.LP : P.LP + P.JB;

  // Compute per-leg reward
  const perLeg = {
    MC: Number((matrixBase * P.MC).toFixed(8)),
    JB: Number((matrixBase * jbPct).toFixed(8)),
    NSP: Number((matrixBase * P.NSP).toFixed(8)),
    CR: Number((matrixBase * P.CR).toFixed(8)),
    LP: Number((matrixBase * lpPct).toFixed(8)),
    CP: Number((matrixBase * P.CP).toFixed(8)),
  };

  // Determine legs per position
  const legsPerPosition = stage === 1 ? 2 : 10; // 2×2=2, 2×5=10
  const rewards = {
    MC: perLeg.MC * legsPerPosition,
    JB: perLeg.JB * legsPerPosition,
    NSP: perLeg.NSP * legsPerPosition,
    CR: perLeg.CR * legsPerPosition,
    LP: perLeg.LP * legsPerPosition,
    CP: perLeg.CP * legsPerPosition,
  };

  // Update user earnings in matrix
  await prisma.matrix.update({
    where: { id: cur.id },
    data: { earnings: { increment: rewards.MC + rewards.NSP } },
  });

  // Auto-create next stage if all legs filled
  let newStage = stage;
  if (stage < 20) {
    newStage = stage + 1;
    await prisma.matrix.create({
      data: { userId, stage: newStage, position: 0, earnings: 0 },
    });
  }

  return {
    success: true,
    stage,
    newStage,
    rewards,
    legsFilled: legsPerPosition,
  };
}
