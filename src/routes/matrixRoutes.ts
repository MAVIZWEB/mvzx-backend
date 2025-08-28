 import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = Router();

// --- VIEW USER MATRIX STATUS ---
router.get("/:userId", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const matrix = await prisma.matrix.findMany({ where: { userId } });
    res.json({ success: true, matrix });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- VIEW ALL MATRIX STAGES ---
router.get("/", async (req, res) => {
  try {
    const all = await prisma.matrix.findMany();
    res.json({ success: true, all });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
