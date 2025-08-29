 import { Response } from "express";
import { AuthedRequest } from "../middlewares/authMiddleware";
import { createStake, claimStake } from "../services/stakeService";

export async function stakeCreate(req: AuthedRequest, res: Response) {
  const { amountMVZX } = req.body as { amountMVZX: number };
  const s = await createStake(req.user!.id, amountMVZX);
  res.json({ success: true, stake: s });
}

export async function stakeClaim(req: AuthedRequest, res: Response) {
  const { stakeId } = req.body as { stakeId: number };
  const payout = await claimStake(stakeId, req.user!.id);
  res.json({ success: true, payout });
}
