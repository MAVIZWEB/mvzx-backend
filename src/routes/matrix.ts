import { Router } from "express";

const router = Router();

// MLM stage badges mapping
const stageBadges: { [key: number]: { name: string; color: string; requiredMC: number } } = {
  1: { name: "Bronze Rank", color: "#cd7f32", requiredMC: 2000 },
  2: { name: "Silver Rank", color: "#c0c0c0", requiredMC: 4000 },
  3: { name: "Gold Rank", color: "#ffd700", requiredMC: 8000 },
  4: { name: "Platinum Rank", color: "#e5e4e2", requiredMC: 16000 },
  5: { name: "Emerald Rank", color: "#50c878", requiredMC: 32000 },
  6: { name: "Ruby Rank", color: "#e0115f", requiredMC: 64000 },
  7: { name: "Sapphire Rank", color: "#0f52ba", requiredMC: 128000 },
  8: { name: "Diamond Rank", color: "#b9f2ff", requiredMC: 256000 },
  9: { name: "Crown Rank", color: "#9932cc", requiredMC: 512000 },
  10: { name: "Legend Rank", color: "#ff4500", requiredMC: 0 }, // Final stage
};

router.get("/status/:userId", async (req, res) => {
  const { userId } = req.params;

  // ⚡ Normally fetch from DB (Matrix.stage, earnings, etc.)
  const stage = 5; // Example: user is Emerald
  const badge = stageBadges[stage];

  const nextStage = stage < 10 ? stageBadges[stage + 1] : null;

  res.json({
    userId,
    stage,
    position: 5,
    expectedEarnings: 2000,
    earningsSoFar: 1000,
    earningsLeft: 1000,
    badge,      // current badge
    nextStage,  // info about next badge
  });
});

export default router;
