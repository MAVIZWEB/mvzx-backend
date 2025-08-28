 import express from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = express.Router();

// Fetch user matrix details
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const matrices = await prisma.matrix.findMany({ where: { userId: Number(userId) } });
    res.json({ success: true, matrices });
  } catch (err) {
    res.status(500).json({ error: "Matrix fetch failed" });
  }
});

export default router;
