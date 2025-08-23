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

const stageBadges: Record<number, { name: string; color: string }> = {
  1:{name:"Bronze Rank",color:"#cd7f32"},2:{name:"Silver Rank",color:"#c0c0c0"},3:{name:"Gold Rank",color:"#ffd700"},
  4:{name:"Platinum Rank",color:"#e5e4e2"},5:{name:"Emerald Rank",color:"#50c878"},6:{name:"Ruby Rank",color:"#e0115f"},
  7:{name:"Sapphire Rank",color:"#0f52ba"},8:{name:"Diamond Rank",color:"#b9f2ff"},9:{name:"Crown Rank",color:"#9932cc"},
  10:{name:"Legend Rank",color:"#ff4500"},11:{name:"Apex I",color:"#367cff"},12:{name:"Apex II",color:"#268dff"},
  13:{name:"Apex III",color:"#16a9ff"},14:{name:"Myth I",color:"#12b981"},15:{name:"Myth II",color:"#0ea5e9"},
  16:{name:"Myth III",color:"#eab308"},17:{name:"Elite I",color:"#ef4444"},18:{name:"Elite II",color:"#22c55e"},
  19:{name:"Elite III",color:"#8b5cf6"},20:{name:"Legendary",color:"#f97316"},
};

router.get("/status/me", auth, async (req: any, res) => {
  const uid = (req.user as any).uid;
  const rows = await prisma.matrix.findMany({ where: { userId: uid }, orderBy: { stage: "asc" }});
  const curr = rows[rows.length-1] || { stage: 1, position: 0, earnings: 0 };
  const badge = stageBadges[curr.stage];
  res.json({ stage: curr.stage, position: curr.position, earnings: curr.earnings, badge, next: stageBadges[curr.stage+1] || null });
});

export default router;
