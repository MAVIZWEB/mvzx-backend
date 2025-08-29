 import { Router } from "express";
import { getMatrix } from "../controllers/matrixController";
const router = Router();

router.get("/:userId", getMatrix);
export default router;
