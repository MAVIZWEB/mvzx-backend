import { Router } from "express";

const router = Router();

router.get("/status/:userId", async (req, res) => {
  const { userId } = req.params;
  res.json({
    userId,
    stage: 1,
    position: 5,
    expectedEarnings: 2000,
    earningsSoFar: 1000,
    earningsLeft: 1000
  });
});

export default router;
