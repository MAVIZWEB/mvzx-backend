 import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const P = {
  MC: 0.15,
  JB: 0.10,
  NSP: 0.35,
  CR: 0.20,
  LP: 0.10,
  CP: 0.10
};

export async function assignPositionAndDistribute(userId: number, matrixBase: number) {
  let cur = await prisma.matrix.findFirst({ where: { userId }, orderBy: { stage: "desc" } });
  if (!cur) cur = await prisma.matrix.create({ data: { userId, stage: 1, position: 0, earnings: 0 } });

  const stage = cur.stage;
  const jbPct = stage === 1 ? P.JB : 0;
  const lpPct = stage === 1 ? P.LP : P.LP + P.JB; // stage>=2 gets JB->LP

  const perLeg = {
    MC: Number((matrixBase * P.MC).toFixed(8)),
    JB: Number((matrixBase * jbPct).toFixed(8)),
    NSP: Number((matrixBase * P.NSP).toFixed(8)),
    CR: Number((matrixBase * P.CR).toFixed(8)),
    LP: Number((matrixBase * lpPct).toFixed(8)),
    CP: Number((matrixBase * P.CP).toFixed(8))
  };

  const legsToCredit = 2; // simplified per deposit unit
  const rewards = {
    MC: perLeg.MC * legsToCredit,
    JB: perLeg.JB * legsToCredit,
    NSP: perLeg.NSP * legsToCredit,
    CR: perLeg.CR * legsToCredit,
    LP: perLeg.LP * legsToCredit,
    CP: perLeg.CP * legsToCredit
  };

  await prisma.matrix.update({
    where: { id: cur.id },
    data: { earnings: { increment: rewards.MC + rewards.NSP } }
  });

  // Advance stage if not already at 20
  let newStage = stage;
  if (stage < 20) {
    newStage = stage + 1;
    await prisma.matrix.create({ data: { userId, stage: newStage, position: 0, earnings: 0 } });
  }

  return { stage, newStage, rewards, legsFilled: legsToCredit };
}
