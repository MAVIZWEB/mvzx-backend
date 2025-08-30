 import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

/**
 * Percent definitions (per LEG base)
 * baseAmount = token amount per purchase unit
 */
const P = {
  MC: 0.15,
  JB: 0.10,   // only stage 1
  NSP: 0.35,
  CR: 0.20,
  LP: 0.10,   // stage 1
  CP: 0.10
};

export async function assignPositionAndDistribute(userId: number, matrixBase: number) {
  // Fetch last stage
  let cur = await prisma.matrix.findFirst({ where: { userId }, orderBy: { stage: "desc" } });
  if (!cur) cur = await prisma.matrix.create({ data: { userId, stage: 1, position: 0, earnings: 0 } });

  const stage = cur.stage;
  const jbPct = stage === 1 ? P.JB : 0;
  const lpPct = stage === 1 ? P.LP : P.LP + P.JB; // stage >=2 LP gets JB added => 20%

  const perLeg = {
    MC: Number((matrixBase * P.MC).toFixed(8)),
    JB: Number((matrixBase * jbPct).toFixed(8)),
    NSP: Number((matrixBase * P.NSP).toFixed(8)),
    CR: Number((matrixBase * P.CR).toFixed(8)),
    LP: Number((matrixBase * lpPct).toFixed(8)),
    CP: Number((matrixBase * P.CP).toFixed(8)),
  };

  // Fill two legs per purchase unit
  const legsToCredit = 2;

  const rewards = {
    MC: perLeg.MC * legsToCredit,
    JB: perLeg.JB * legsToCredit,
    NSP: perLeg.NSP * legsToCredit,
    CR: perLeg.CR * legsToCredit,
    LP: perLeg.LP * legsToCredit,
    CP: perLeg.CP * legsToCredit,
  };

  // Persist earnings (user-visible: MC + NSP)
  await prisma.matrix.update({
    where: { id: cur.id },
    data: { earnings: { increment: rewards.MC + rewards.NSP }, position: { increment: 1 } }
  });

  // Auto-create next stage if legs filled and stage < 20
  let newStage = stage;
  if (stage < 20 && cur.position + legsToCredit >= 2) {
    newStage = stage + 1;
    await prisma.matrix.create({ data: { userId, stage: newStage, position: 0, earnings: 0 } });
  }

  return {
    success: true,
    stage,
    newStage,
    rewards,
    legsFilled: legsToCredit
  };
}
