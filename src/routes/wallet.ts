 import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
const prisma = new PrismaClient();
const router = Router();

function auth(req: any, res: any, next: any) {
  const h = req.headers.authorization || "";
  const t = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!t) return res.status(401).json({ error: "unauthorized" });
  try { req.user = jwt.verify(t, process.env.JWT_SECRET!); next(); } catch { return res.status(401).json({ error: "unauthorized" }); }
}

router.get("/me", auth, async (req: any, res) => {
  const uid = (req.user as any).uid;
  const bals = await prisma.balance.findMany({ where: { userId: uid }, orderBy: { token: "asc" } });
  res.json({ balances: bals });
});

export default router;
