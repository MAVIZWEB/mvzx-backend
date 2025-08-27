import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const h = req.headers.authorization;
  if(!h) return res.status(401).json({ error: 'no auth' });
  const token = h.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || '');
    (req as any).user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'invalid token' });
  }
}
