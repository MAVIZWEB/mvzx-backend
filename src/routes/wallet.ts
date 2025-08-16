import { Router } from "express";

const router = Router();

router.get("/:userId", async (req, res) => {
  const { userId } = req.params;
  res.json({
    userId,
    balances: [
      { token: "USDT", amount: 50.12345678 },
      { token: "MVZx", amount: 120.5 }
    ]
  });
});

export default router;
