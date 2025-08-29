 import prisma from "../prisma";
import { toFixed } from "../utils/numbers";

/**
 * Matrix rules per your provided spec (simplified operational model):
 * - Stage 1: 2x2; Stage 2–20: 2x5 (handled as advancing one stage after each purchase unit fills two legs)
 * - Pay 50% of per-leg reward immediately; the remaining 50% accumulates in pending and is released on stage completion via admin action.
 * - Percent definitions are per LEG base; matrixBase provided by caller is the per-unit base (e.g., 2000 NGN-equivalent or 1.5 USDT-equivalent, but we operate in NGN-equivalent for accounting clarity).
 */
const P = { MC: 0.15, JB: 0.10, NSP: 0.35, CR: 0.20, LP: 0.10, CP: 0.10 };

export async function ensureCurrentStage(userId: number) {
  let cur = await prisma.matrix.findFirst({ where: { userId }, orderBy: { stage: "desc" } });
  if (!cur) cur = await prisma.matrix.create({ data: { userId, stage: 1 } });
  return cur;
}

export async function creditLegsAndMaybeAdvance(userId: number, matrixBaseNGN: number) {
  const cur = await ensureCurrentStage(userId);
  const stage = cur.stage;
  const jbPct = stage === 1 ? P.JB : 0;
  const lpPct = stage === 1 ? P.LP : P.LP + P.JB; // stage>=2: LP effectively 20%

  const perLeg = {
    MC: toFixed(matrixBaseNGN * P.MC),
    JB: toFixed(matrixBaseNGN * jbPct),
    NSP: toFixed(matrixBaseNGN * P.NSP),
    CR: toFixed(matrixBaseNGN * P.CR),
    LP: toFixed(matrixBaseNGN * lpPct),
    CP: toFixed(matrixBaseNGN * P.CP)
  };

  const legs = 2; // each eligible purchase fills 2 legs (as per your simplified flow)
  const total = Object.values(perLeg).reduce((a, b) => a + b, 0) * legs;
  const half = total / 2;

  const updated = await prisma.matrix.update({
    where: { id: cur.id },
    data: {
      legsFilled: { increment: legs },
      creditedNGN: { increment: half }, // pay half now
      pendingNGN: { increment: total - half } // pay rest on completion by admin
    }
  });

  // Complete current stage on every 2 legs (operational simplification)
  const nowLegs = updated.legsFilled;
  const requiredLegs = 2; // stage completion threshold in this simplified implementation
  let advanced = false;

  if (!updated.completed && nowLegs >= requiredLegs) {
    await prisma.matrix.update({ where: { id: updated.id }, data: { completed: true } });
    if (stage < 20) {
      await prisma.matrix.create({ data: { userId, stage: stage + 1 } });
      advanced = true;
    }
  }

  return { perLeg, total, halfPaidNow: half, advanced, stage };
}

export async function adminReleasePending(userId: number, stage: number) {
  const m = await prisma.matrix.findFirst({ where: { userId, stage } });
  if (!m) throw new Error("Stage not found");
  const pending = Number(m.pendingNGN);
  if (pending <= 0) return { released: 0 };
  await prisma.matrix.update({ where: { id: m.id }, data: { pendingNGN: 0 } });
  await prisma.user.update({ where: { id: userId }, data: { mvzxBalance: { increment: pending } } });
  return { released: pending };
}
