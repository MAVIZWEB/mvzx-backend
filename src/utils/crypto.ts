import bcrypt from 'bcrypt';
const SALT = process.env.PIN_SALT || 'amabeth 41';
export async function hashPin(pin: string) {
  return bcrypt.hash(pin + SALT, 10);
}
export async function comparePin(pin:string, hash:string) {
  return bcrypt.compare(pin + SALT, hash);
}
