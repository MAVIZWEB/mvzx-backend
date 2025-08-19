 import { Router } from "express";

const router = Router();

// MLM stage badges mapping (same as frontend)
const stageBadges: { [key: number]: { name: string; color: string } } = {
  1: { name: "Bronze Rank", color: "#cd7f32" },
  2: { name: "Silver Rank", color: "#c0c0c0" },
  3: { name: "Gold Rank", color: "#ffd700" },
  4: { name: "Platinum Rank", color: "#e5e4e2" },
  5: { name: "Emerald Rank", color: "#50c878" },
  6: { name: "Ruby Rank", color: "#e0115f" },
  7: { name: "Sapphire Rank", color: "#0f52ba" },
  8: { name: "Diamond Rank", color: "#b9f2ff" },
  9: { name: "Crown Rank", color: "#9932cc" },
  10: { name: "Legend Rank", color: "#ff4500" },
};

router.get("/status/:userId", async (req, res) => {
  const { userId } = req.params;

  // ⚡ Normally we'd fetch from DB, here static for example
  const stage = 5; 
  const badge = stageBadges[stage];

  res.json({
    userId,
    stage,
    position: 5,
    expectedEarnings: 2000,
    earningsSoFar: 1000,
    earningsLeft: 1000,
    badge,  // 🆕 sends {name, color}
  });
});

export default router;
