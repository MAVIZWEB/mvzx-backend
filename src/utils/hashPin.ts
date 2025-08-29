 import bcrypt from "bcryptjs";
import { env } from "./env";

export function hashPin(pin: string) {
  return bcrypt.hashSync(pin + env.PIN_SALT, 10);
}
export function verifyPin(pin: string, hash: string) {
  return bcrypt.compareSync(pin + env.PIN_SALT, hash);
}
