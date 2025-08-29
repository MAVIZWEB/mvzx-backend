 // backend/src/services/matrixService.ts
import { prisma } from "../prisma";

const P = {
  MC: 0.15,
  JB: 0.10,   // only stage 1
  NSP: 0.35,
  CR: 0.20,
  LP: 0.10,   // +0.10 added for stage >=2 (effectively 20%)
  CP: 0.10,
};

export async function assignPositionAndDistribute(userId: number, units: number, slotCostNGN: number) {
  // units = number of slots purchased (each slot is slotCostNGN)
  // For each unit, create or increment matrix
  const results: any[] = [];
  for (let i = 0; i < units; i++) {
    // get latest matrix for user
    let cur = await prisma.matrix.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } });
    if (!cur) {
      cur = await prisma.matrix.create({ data: { userId, stage: 1 } });
    }

    const stage = cur.stage;
    const jbPct = stage === 1 ? P.JB : 0;
    const lpPct = stage === 1 ? P.LP : P.LP + P.JB;

    // matrixBase in NGN per unit = slotCostNGN
    const base = Number(slotCostNGN);
    const perLeg = {
      MC: Number((base * P.MC).toFixed(2)),
      JB: Number((base * jbPct).toFixed(2)),
      NSP: Number((base * P.NSP).toFixed(2)),
      CR: Number((base * P.CR).toFixed(2)),
      LP: Number((base * lpPct).toFixed(2)),
      CP: Number((base * P.CP).toFixed(2)),
    };

    // each unit fills 2 legs (2x2 or 2x5 logic simplified)
    const legsToCredit = 2;

    // For each leg, credit half immediately to creditedNGN (50% per leg pay), rest to pendingNGN
    const immediate = (perLeg.MC + perLeg.NSP) * legsToCredit / 2; // user-visible earnings immediate half-of-legs
    const pending = (perLeg.MC + perLeg.NSP) * legsToCredit / 2;

    // update matrix record
    await prisma.matrix.update({
      where: { id: cur.id },
      data: {
        legsFilled: { increment: legsToCredit },
        creditedNGN: { increment: immediate },
        pendingNGN: { increment: pending },
      }
    });

    // if legsFilled >= threshold (for stage completion) => complete stage and create next stage
    const updated = await prisma.matrix.findUnique({ where: { id: cur.id } });
    const legs = updated?.legsFilled || 0;
    const completeThreshold = stage === 1 ? 2 : 10; // 2x2 => 2 legs, 2x5 => 10 legs
    let newStage = stage;
    if (legs >= completeThreshold && !updated?.completed) {
      // mark completed, create next stage if <20
      await prisma.matrix.update({ where: { id: cur.id }, data: { completed: true } });
      if (stage < 20) {
        newStage = stage + 1;
        await prisma.matrix.create({ data: { userId, stage: newStage } });
      }
      // Admin dashboard should pick up pendingNGN for lump-sum payment
    }

    results.push({ unit: i + 1, stage, newStage, immediate, pending, perLeg });
  }
  return results;
}
