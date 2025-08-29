import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';
export function sign(payload: any, expiresIn = '30d') { return jwt.sign(payload, JWT_SECRET, { expiresIn }); }
export function verify(token: string) { try { return jwt.verify(token, JWT_SECRET); } catch (e) { return null; } }
