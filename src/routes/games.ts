// src/routes/game.ts
import { Router } from "express";
const router = Router();

router.post("/spin", async (_req, res) => {
  const rewards = ["0.125 MVZx","0.25 MVZx","0.375 MVZx","0.5 MVZx","0.625 MVZx","0.75 MVZx","1 MVZx","3× Free Reward"];
  const i = Math.floor(Math.random()*rewards.length);
  const amount = [0.125,0.25,0.375,0.5,0.625,0.75,1,0][i] || 0;
  res.json({ rewardLabel: rewards[i], amount });
});
export default router;
