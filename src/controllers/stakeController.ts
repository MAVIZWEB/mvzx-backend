 import { Request, Response } from "express";
import { createStake, claimStake } from "../services/stakeService";

export async function stakeCreate(req: Request, res: Response) {
  const { userId, amount } = req.body;
  const stake = await createStake(userId, amount);
  res.json({ success: true, stake });
}

export async function stakeClaim(req: Request, res: Response) {
  const { userId, stakeId } = req.body;
  const payout = await claimStake(stakeId, userId);
  res.json({ success: true, payout });
}
