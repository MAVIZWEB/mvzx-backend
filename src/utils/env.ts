import { z } from "zod";

const EnvSchema = z.object({
  BNB_RPC_URL: z.string(),
  MVZX_TOKEN_CONTRACT: z.string(),
  USDT_CONTRACT: z.string(),
  SLOT_COST_NGN: z.string(), // "2000"
  MVZX_USDT_RATE: z.string(), // "0.15" (USDT per MVZX)
  FLW_PUBLIC_KEY: z.string(),
  FLW_SECRET_KEY: z.string(),
  FLW_ENCRYPTION_KEY: z.string(),
  ADMIN_PRIVATE_KEY: z.string(),
  COMPANY_WALLET: z.string(),
  PIN_SALT: z.string(),
  API_RATE_LIMIT: z.string(),
  PORT: z.string().optional(),
  JWT_SECRET: z.string(),
  DATABASE_URL: z.string(),
  LIVE: z.string().optional(),
  NGN_PER_USDT: z.string(),
  COMPANY_BANK_NAME: z.string(),
  COMPANY_BANK_ACCOUNT_NUMBER: z.string(),
  COMPANY_BANK_ACCOUNT_NAME: z.string(),
  FRONTEND_URL: z.string(),
  CORS_ORIGIN: z.string()
});

export const env = EnvSchema.parse(process.env);
export const LIVE = (env.LIVE ?? "false").toLowerCase() === "true";
export const SLOT_COST = Number(env.SLOT_COST_NGN);
export const MVZX_USDT_RATE = Number(env.MVZX_USDT_RATE); // USDT per MVZX
export const NGN_PER_USDT = Number(env.NGN_PER_USDT);
