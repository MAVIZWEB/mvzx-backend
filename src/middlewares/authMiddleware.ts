import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../utils/env";

export interface AuthedRequest extends Request { user?: { id: number } }

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: "Missing token" });
  try {
    const token = auth.replace(/^Bearer\s+/i, "");
    const payload = jwt.verify(token, env.JWT_SECRET) as { id: number };
    req.user = { id: payload.id };
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}
