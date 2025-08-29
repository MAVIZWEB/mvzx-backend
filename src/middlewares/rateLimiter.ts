import rateLimit from "express-rate-limit";
import { env } from "../utils/env";

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: Number(env.API_RATE_LIMIT),
  standardHeaders: true,
  legacyHeaders: false
});
