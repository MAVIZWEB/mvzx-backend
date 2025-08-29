 import bcrypt from "bcryptjs";

export function hashPin(pin: string, salt: string) {
  return bcrypt.hashSync(pin + salt, 10);
}

export function verifyPin(pin: string, salt: string, hash: string) {
  return bcrypt.compareSync(pin + salt, hash);
}
