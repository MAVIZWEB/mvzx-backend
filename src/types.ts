export type StageConfig = {
  stage: number;
  // For stage 8-10 pegging: if peggedTotalNGN set, override MC_total
  peggedMcTotalNGN?: number | null;
};

export type SimOptions = {
  stages: number;              // default 10
  principalSlotPrice: number;  // e.g., 2000 (NGN)
  referralPushCount: number;   // 32
  referralMcPct: number;       // 0.324 (32.4%)
  referralNspPct: number;      // 0.10 (10%)
  principalMcPct: number;      // 0.162
  principalNspPct: number;     // 0.05
  stageRegularMcPct: number;   // 0.162
  stageRegularNspPct: number;  // 0.05
  peggedStageTotals?: Record<number, number>; // e.g. {8:10000000,9:11000000,...}
  preferReferralToSetNextStagePrice?: boolean; // whether a referral's NSP should set next stage price if it completes after principal
  initialAdminAccounts?: { id: string, referralCode: string }[]; // hard-coded admin accounts
};
