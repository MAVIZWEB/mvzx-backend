import { Router } from "express";
import { z } from "zod";
import {
  runFullSimulation,
  defaultSimOptions,
  SimResult
} from "../simulation.js";

const router = Router();

// input validation
const SimBody = z.object({
  options: z.object({
    stages: z.number().int().positive().default(10),
    principalSlotPrice: z.number().positive().default(2000),
    referralPushCount: z.number().int().positive().default(32),
    preferReferralToSetNextStagePrice: z.boolean().optional().default(true)
  }).optional()
});

router.post("/", async (req, res) => {
  const parse = SimBody.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.format() });
  const body = parse.data;
  const opts = { ...defaultSimOptions, ...(body.options || {}) };
  try {
    const result: SimResult = runFullSimulation(opts);
    res.json({ ok: true, result });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message || String(err) });
  }
});

export default router;
