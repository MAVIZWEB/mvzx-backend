 import { Router } from "express";
import { stakeCreate, stakeClaim } from "../controllers/stakeController";
const router = Router();

router.post("/create", stakeCreate);
router.post("/claim", stakeClaim);
export default router;
