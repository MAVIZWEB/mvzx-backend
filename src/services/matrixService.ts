 // src/services/matrixService.ts
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

/**
 * Percent definitions (per LEG base)
 */
const P = {
  MC: 0.15,
  JB: 0.10,   // only stage 1
  NSP: 0.35,
  CR: 0.20,
  LP: 0.10,   // +0.10 added for stage >=2 (effectively 20%)
  CP: 0.10,
};

export async function assignPositionAndDistribute(userId: number, matrixBase: number) {
  // Get or create current stage record
  let cur = await prisma.matrix.findFirst({
    where: { userId },
    orderBy: { stage: "desc" }
  });

  if (!cur) {
    cur = await prisma.matrix.create({
      data: { userId, stage: 1, position: 0, earnings: 0 }
    });
  }

  const stage = cur.stage;
  const jbPct = stage === 1 ? P.JB : 0;
  const lpPct = stage === 1 ? P.LP : P.LP + P.JB; // stage>=2 LP gets JB added

  const perLeg = {
    MC: Number((matrixBase * P.MC).toFixed(8)),
    JB: Number((matrixBase * jbPct).toFixed(8)),
    NSP: Number((matrixBase * P.NSP).toFixed(8)),
    CR: Number((matrixBase * P.CR).toFixed(8)),
    LP: Number((matrixBase * lpPct).toFixed(8)),
    CP: Number((matrixBase * P.CP).toFixed(8)),
  };

  // simplified: each purchase fills 2 legs
  const legsToCredit = 2;
  const rewards = {
    MC: perLeg.MC * legsToCredit,
    JB: perLeg.JB * legsToCredit,
    NSP: perLeg.NSP * legsToCredit,
    CR: perLeg.CR * legsToCredit,
    LP: perLeg.LP * legsToCredit,
    CP: perLeg.CP * legsToCredit,
  };

  // Track MC+NSP as user visible earnings
  await prisma.matrix.update({
    where: { id: cur.id },
    data: { earnings: { increment: rewards.MC + rewards.NSP } }
  });

  // Move to next stage
  let newStage = stage;
  if (stage < 20) {
    newStage = stage + 1;
    await prisma.matrix.create({
      data: { userId, stage: newStage, position: 0, earnings: 0 }
    });
  }

  return {
    success: true,
    stage,
    newStage,
    rewards,
    legsFilled: legsToCredit
  };
}
