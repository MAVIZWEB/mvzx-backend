import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export function hashPin(pin: string, saltPepper: string) {
  return bcrypt.hashSync(pin + (saltPepper || ''), 10);
}
export function verifyPin(pin: string, saltPepper: string, hash: string) {
  return bcrypt.compareSync(pin + (saltPepper || ''), hash);
}
export function randomAddr() {
  return '0x' + crypto.randomBytes(20).toString('hex');
}
export function makeReferralCode() {
  return crypto.randomBytes(4).toString('hex');
}
