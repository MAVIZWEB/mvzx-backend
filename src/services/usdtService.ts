import { NGN_PER_USDT } from "../utils/env";
export const ngnToUsdt = (ngn: number) => ngn / NGN_PER_USDT;
export const usdtToNgn = (usdt: number) => usdt * NGN_PER_USDT;
