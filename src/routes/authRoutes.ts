 import { Router } from "express";
import { signup, login } from "../controllers/authController";
const r = Router();

r.post("/signup", signup); // includes AIRDROP
r.post("/login", login);

export default r;
