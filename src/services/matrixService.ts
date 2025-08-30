import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Percent definitions (per LEG base)
const P = {
  MC: 0.15,
  JB: 0.10,   // only stage 1
  NSP: 0.35,
  CR: 0.20,
  LP: 0.10,   // +0.10 added for stage >=2 (effectively 20%)
  CP: 0.10,
};

export async function assignPositionAndDistribute(userId: number, matrixBase: number, purchaseId: number) {
  // matrixBase is the 'per-unit' base (e.g. 1.5 USDT or 2000 NGN equivalent)
  // Simple 2x2 logic per purchase unit:
  // - create or get user's current stage record
  let cur = await prisma.matrix.findFirst({ where: { userId }, orderBy: { stage: "desc" } });
  if (!cur) cur = await prisma.matrix.create({ data: { userId, stage: 1, position: 0, earnings: 0 } });

  const stage = cur.stage;
  const jbPct = stage === 1 ? P.JB : 0;
  const lpPct = stage === 1 ? P.LP : P.LP + P.JB; // stage>=2 LP gets JB added => LP = 20%
  const perLeg = {
    MC: Number((matrixBase * P.MC).toFixed(8)),
    JB: Number((matrixBase * jbPct).toFixed(8)),
    NSP: Number((matrixBase * P.NSP).toFixed(8)),
    CR: Number((matrixBase * P.CR).toFixed(8)),
    LP: Number((matrixBase * lpPct).toFixed(8)),
    CP: Number((matrixBase * P.CP).toFixed(8)),
  };

  // For simplicity: treat "leg" as 1 unit; each user's new purchase unit fills 1 or 2 legs.
  // We'll compute two legs per full position (2x2).
  const legsToCredit = 2; // when a position is created it will attempt to fill two legs (simplified)
  const rewards = {
    MC: perLeg.MC * legsToCredit,
    JB: perLeg.JB * legsToCredit,
    NSP: perLeg.NSP * legsToCredit,
    CR: perLeg.CR * legsToCredit,
    LP: perLeg.LP * legsToCredit,
    CP: perLeg.CP * legsToCredit,
  };

  // Persist earnings (track MC+NSP as user visible earnings)
  await prisma.matrix.update({
    where: { id: cur.id },
    data: { earnings: { increment: rewards.MC + rewards.NSP } }
  });

  // Create new next stage record if legs filled and stage < 20
  let newStage = stage;
  if (stage < 20) {
    newStage = stage + 1;
    await prisma.matrix.create({ data: { userId, stage: newStage, position: 0, earnings: 0 } });
  } else {
    // stage 20: do NOT auto recycle user; company-only reentry handled separately
  }

  // Record the distribution
  await prisma.matrixDistribution.create({
    data: {
      userId,
      purchaseId,
      stage,
      matrixBase,
      mcReward: rewards.MC,
      jbReward: rewards.JB,
      nspReward: rewards.NSP,
      crReward: rewards.CR,
      lpReward: rewards.LP,
      cpReward: rewards.CP,
    }
  });

  return {
    success: true,
    stage,
    newStage,
    rewards,
    legsFilled: legsToCredit
  };
}
