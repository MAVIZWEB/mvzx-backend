import { randomBytes } from "crypto";

// Very simple wallet generator for now
export function generateWalletAddress(): string {
  const buffer = randomBytes(20); // 20 bytes = 40 hex chars
  return "0x" + buffer.toString("hex");
}
