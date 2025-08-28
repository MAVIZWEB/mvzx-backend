 import express from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = express.Router();

// ✅ Get user's matrix progress
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const stages = await prisma.matrix.findMany({
      where: { userId: Number(userId) },
      orderBy: { stage: "asc" },
    });

    return res.json({ success: true, stages });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch matrix progress" });
  }
});

export default router;
