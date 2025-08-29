 import { Router } from "express";
import { getMyMatrix, adminRelease } from "../controllers/matrixController";
const r = Router();

r.get("/:userId", getMyMatrix);
r.post("/admin/release", adminRelease); // protect in production (admin auth)

export default r;
