 import { Router } from "express";
import { withdraw } from "../controllers/withdrawalController";
const router = Router();

router.post("/", withdraw);
export default router;
