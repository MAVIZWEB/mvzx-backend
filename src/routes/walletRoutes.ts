import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = Router();

// --- CHECK BALANCE ---
router.get("/:userId", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ success: true, balance: user.balance });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- WITHDRAW ---
router.post("/withdraw", async (req, res) => {
  try {
    const { userId, amount, method, destination } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: "User not found" });

    if (amount > user.balance) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { balance: { decrement: amount } },
    });

    // Record withdrawal request
    const wd = await prisma.withdrawal.create({
      data: { userId, amount, method, destination, status: "pending" },
    });

    res.json({ success: true, withdrawal: wd });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
