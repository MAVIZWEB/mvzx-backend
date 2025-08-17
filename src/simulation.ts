// simulation.ts
import { SimOptions, StageConfig } from "./types.js";

/**
 * Simulation engine implementing the exact rules you signed off:
 * - Stage-1 principal: 62 purchases, principalMcPct (16.2%), principalNspPct (5%), JB 10% (applies to stage1 buyers)
 * - Subsequent referral pushes after principal: referralPushCount purchases each,
 *   referralMcPct (32.4%), referralNspPct (10%), JB for the buyers
 * - Stage 2..N: P_n is set to the NSP_total produced by the finishing event (principal or referral as configured),
 *   then MC = stageRegularMcPct (16.2%) and NSP = 5% of P_n. JB = 0 for stage >=2
 * - Pegging: Stages 8..10 may be pegged via peggedStageTotals.
 *
 * The runFullSimulation function returns detailed ledger lines per stage and overall totals.
 */

export type SimResult = {
  stages: {
    stage: number;
    slotPrice: number; // P_n used for that stage
    purchasesThisStage: number; // always 62 for stage fill (the stage itself)
    matrixInflow: number; // 62 * matrix base (which may be derived from principal or P_n)
    mcPerLeg: number;
    mcTotal: number;
    jbTotal: number;
    nspPerLeg: number;
    nspTotal: number;
    companyProfitMatrixHalf: number;
    companyLiquidityHalf: number;
    grossStage: number;
    tranchePayouts: { trancheIndex: number; amount: number }[]; // sums paid per 6-leg tranche (if applicable)
  }[];
  totals: {
    totalPurchases: number;
    totalGross: number;
    totalMcPaid: number;
    totalJbPaid: number;
    totalNspPaid: number;
    totalCompanyProfitMatrix: number;
    totalCompanyLiquidity: number;
    totalCompanyRetained: number;
  };
};

export const defaultSimOptions: SimOptions = {
  stages: 10,
  principalSlotPrice: 2000,
  referralPushCount: 32,
  referralMcPct: 0.324,
  referralNspPct: 0.10,
  principalMcPct: 0.162,
  principalNspPct: 0.05,
  stageRegularMcPct: 0.162,
  stageRegularNspPct: 0.05,
  peggedStageTotals: { 8: 10_000_000, 9: 11_000_000, 10: 12_000_000 },
  preferReferralToSetNextStagePrice: true,
  initialAdminAccounts: [
    { id: "company_admin_1", referralCode: "ADM1" },
    { id: "company_admin_2", referralCode: "ADM2" },
    { id: "company_admin_3", referralCode: "ADM3" }
  ]
};

/**
 * Helper: compute per-stage numbers given the slotPrice and whether it's stage1 principal or not
 */
function computeStageNumbers(stage: number, slotPrice: number, opts: SimOptions, isStage1Principal = false, peggedMcTotal?: number) {
  // matrix base considered per purchase for feeder-only math is 1000 when human purchases are used
  const matrixBase = slotPrice >= 2000 ? Math.min(1000, slotPrice / 2) : slotPrice / 2;
  const purchases = 62;
  const gross = purchases * slotPrice;
  // JB only for stage 1, and JB applies per buyer in Stage 1 (100)
  const jbPerBuyer = isStage1Principal ? 0.10 * (matrixBase) : 0;
  const jbTotal = jbPerBuyer * purchases;

  // MC and NSP depend on stage rules:
  let mcPerLeg, nspPerLeg, mcTotal;
  if (peggedMcTotal != null && [8,9,10].includes(stage)) {
    // Use pegged total MC for this stage
    mcTotal = peggedMcTotal;
    mcPerLeg = mcTotal / 62;
    // NSP uses regular stage percent
    nspPerLeg = opts.stageRegularNspPct * slotPrice;
  } else {
    if (isStage1Principal) {
      mcPerLeg = opts.principalMcPct * matrixBase;
      nspPerLeg = opts.principalNspPct * matrixBase;
    } else {
      // For stages >=2, use full P_n percentages (stageRegular)
      mcPerLeg = opts.stageRegularMcPct * slotPrice;
      nspPerLeg = opts.stageRegularNspPct * slotPrice;
    }
    mcTotal = mcPerLeg * purchases;
  }

  const nspTotal = nspPerLeg * purchases;
  const matrixPool = purchases * matrixBase; // only meaningful for feeder human purchases
  const companyProfitMatrixHalf = matrixPool - (mcTotal + jbTotal + (isStage1Principal ? 0 : 0) + (isStage1Principal ? 0 : 0));
  const companyLiquidityHalf = purchases * (slotPrice - matrixBase); // liquidity half
  // tranche payouts every 6 legs: number of tranches = 62 / 6 rounded down (we pay per tranche of 6 legs)
  const tranches = Math.floor(62 / 6);
  const tranchePayouts = [];
  for (let t = 1; t <= tranches; t++) {
    tranchePayouts.push({ trancheIndex: t, amount: mcPerLeg * 6 });
  }

  return {
    purchases,
    gross,
    matrixPool,
    mcPerLeg,
    mcTotal,
    jbTotal,
    nspPerLeg,
    nspTotal,
    companyProfitMatrixHalf,
    companyLiquidityHalf,
    tranchePayouts
  };
}

/**
 * The full simulation: creates stage-by-stage ledger following the rules:
 * - Stage1 principal completes first (62 purchases).
 * - After principal exit, a series of referral pushes occur; each referral push uses referralPushCount purchases,
 *   with referralMcPct and referralNspPct applied on the matrixBase (₦1,000).
 * - The first event (principal or referral) that finishes and yields an NSP_total establishes P_2 (the next stage's price).
 * - From stage 2 onward, P_n is whatever NSP_total was created by the event that opened it. Stage 2..N use regular percentages.
 *
 * Note: This run simulates the **flow required** to fill each stage in sequence and returns per-stage results.
 */
export function runFullSimulation(customOpts?: Partial<SimOptions>): SimResult {
  const opts: SimOptions = { ...defaultSimOptions, ...(customOpts || {}) };

  const stagesOut: SimResult["stages"] = [];

  // Stage-1 principal event (62 purchases)
  const P1 = opts.principalSlotPrice;
  // matrix base for stage1: explicitly set to 1000 (half of 2000)
  const matrixBaseStage1 = Math.min(1000, P1 / 2);
  // principal numbers
  const stage1Numbers = computeStageNumbers(1, P1, opts, true, undefined);

  // For Stage1 matrix pool: matrixBase * 62
  const stage1Entry = {
    stage: 1,
    slotPrice: P1,
    purchasesThisStage: 62,
    matrixInflow: 62 * matrixBaseStage1,
    mcPerLeg: stage1Numbers.mcPerLeg,
    mcTotal: stage1Numbers.mcTotal,
    jbTotal: stage1Numbers.jbTotal,
    nspPerLeg: stage1Numbers.nspPerLeg,
    nspTotal: stage1Numbers.nspTotal,
    companyProfitMatrixHalf: stage1Numbers.companyProfitMatrixHalf,
    companyLiquidityHalf: stage1Numbers.companyLiquidityHalf,
    grossStage: stage1Numbers.gross,
    tranchePayouts: stage1Numbers.tranchePayouts
  };

  stagesOut.push(stage1Entry);

  // Which NSP sets P2? principal produced stage1Numbers.nspTotal
  let pNext = stage1Entry.nspTotal; // candidate P2 (e.g. 3100)
  // After principal exit, referrals will be pushed using referral rules: each referral uses referralPushCount purchases
  // For each referral pushed we compute matrix inflow and its NSP (referralNspPct * matrixBase * referralPushCount)
  // According to your rule, each referral's NSP = 10% of 1000 * referralPushCount => 100 * referralPushCount = 3200 for 32 purchases
  // We'll simulate enough activity so the stage2 gets filled (62 positions) — but you asked earlier for sequential per-stage fills, so we just capture stage numbers

  // For conceptual clarity, Stage 2 is then filled by 62 positions that come from the NSP-enabled process.
  // Determine P2: by default use stage1's NSP unless opts.preferReferralToSetNextStagePrice is true
  if (opts.preferReferralToSetNextStagePrice) {
    // simulate first referral push (the first referral after principal). It needs referralPushCount purchases.
    const refPurchases = opts.referralPushCount;
    const refMatrixInflow = refPurchases * matrixBaseStage1; // 1000 * 32 = 32000
    const refMcTotal = opts.referralMcPct * matrixBaseStage1 * refPurchases; // 0.324 * 1000 * 32 = 10368
    const refNspTotal = opts.referralNspPct * matrixBaseStage1 * refPurchases; // 0.10 * 1000 * 32 = 3200
    // If a referral push finishes and produces refNspTotal that is larger than pNext, let it be candidate pNext
    if (refNspTotal > pNext) pNext = refNspTotal;
    // But note: in practical timeline principal finished first (pNext likely = 3100), and referral pushes might occur later.
    // We'll set P2 := pNext (so code respects whichever finished and created larger NSP).
  }

  // Now loop stages 2..N and compute their numbers using P_n = pNext and recurrence pNext := nspTotal for that stage
  let prevP = pNext;
  for (let s = 2; s <= opts.stages; s++) {
    // if stage pegged MC total applies, get pegged total
    const pegged = opts.peggedStageTotals && opts.peggedStageTotals[s] ? opts.peggedStageTotals[s] : undefined;
    const numbers = computeStageNumbers(s, prevP, opts, false, pegged);
    const stageEntry = {
      stage: s,
      slotPrice: prevP,
      purchasesThisStage: 62,
      matrixInflow: 62 * (prevP / 2), // in NSP-driven stages we consider the slotPrice as base for matrix calculations
      mcPerLeg: numbers.mcPerLeg,
      mcTotal: numbers.mcTotal,
      jbTotal: numbers.jbTotal,
      nspPerLeg: numbers.nspPerLeg,
      nspTotal: numbers.nspTotal,
      companyProfitMatrixHalf: numbers.companyProfitMatrixHalf,
      companyLiquidityHalf: numbers.companyLiquidityHalf,
      grossStage: numbers.gross,
      tranchePayouts: numbers.tranchePayouts
    };
    stagesOut.push(stageEntry);
    // Prepare next stage P_n
    // next P := nspTotal (use whatever this stage produced)
    prevP = numbers.nspTotal;
  }

  // Totals
  const totals = {
    totalPurchases: stagesOut.reduce((acc, s) => acc + s.purchasesThisStage, 0),
    totalGross: stagesOut.reduce((acc, s) => acc + s.grossStage, 0),
    totalMcPaid: stagesOut.reduce((acc, s) => acc + s.mcTotal, 0),
    totalJbPaid: stagesOut.reduce((acc, s) => acc + s.jbTotal, 0),
    totalNspPaid: stagesOut.reduce((acc, s) => acc + s.nspTotal, 0),
    totalCompanyProfitMatrix: stagesOut.reduce((acc, s) => acc + s.companyProfitMatrixHalf, 0),
    totalCompanyLiquidity: stagesOut.reduce((acc, s) => acc + s.companyLiquidityHalf, 0),
    totalCompanyRetained: 0 // computed below
  };
  totals.totalCompanyRetained = totals.totalCompanyLiquidity + totals.totalCompanyProfitMatrix;

  return {
    stages: stagesOut,
    totals
  };
}
