 import { Request, Response } from "express";
import { assignPositionAndDistribute } from "../services/matrixService";

export async function placeInMatrix(req: Request, res: Response) {
  try {
    const { userId, baseAmount } = req.body;
    const result = await assignPositionAndDistribute(userId, baseAmount);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
