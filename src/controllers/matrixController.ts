 import { prisma } from "../lib/prisma";

const P = {
  MC: 0.162, // Matrix completion per leg
  JB: 0.10,  // joining bonus stage1
  NSP: 0.05, // next stage position per leg
  CR: 0.20,  // cash reserve (optional)
  LP: 0.10,  // leftover/profit
  CP: 0.10,  // company profit
};

export const placeInMatrix = async (userId: number, stage: number) => {
  const width = stage === 1 ? 2 : 5;

  const parent = await prisma.matrix.findFirst({
    where: { stage, children: { lt: width } },
    orderBy: { id: "asc" },
  });

  const slot = await prisma.matrix.create({
    data: {
      userId,
      stage,
      parentId: parent?.id,
      children: 0,
      position: 0,
      earnings: 0,
    },
  });

  if (parent) {
    await prisma.matrix.update({ where: { id: parent.id }, data: { children: { increment: 1 } } });
  }

  // Distribute MC, JB, NSP, CR per slot
  await prisma.matrix.update({
    where: { id: slot.id },
    data: {
      earnings: { increment: P.MC + P.JB + P.NSP + P.CR + P.LP + P.CP },
    },
  });

  return slot;
};
