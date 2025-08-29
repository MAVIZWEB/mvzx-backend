 import { ethers } from "ethers";
import { env, LIVE } from "../utils/env";

const provider = new ethers.JsonRpcProvider(env.BNB_RPC_URL);
const signer = new ethers.Wallet(env.ADMIN_PRIVATE_KEY, provider);

const erc20Abi = [
  "function transfer(address to,uint256 amount) returns (bool)",
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)"
];

const mvzx = new ethers.Contract(env.MVZX_TOKEN_CONTRACT, erc20Abi, signer);
const usdt = new ethers.Contract(env.USDT_CONTRACT, erc20Abi, signer);

async function decimals(contract: any) {
  return Number(await contract.decimals());
}

export async function transferMVZX(to: string, amountMVZX: number) {
  if (!LIVE) return { mock: true };
  const d = await decimals(mvzx);
  const tx = await mvzx.transfer(to, ethers.parseUnits(amountMVZX.toString(), d));
  return tx.wait();
}

export async function transferUSDT(to: string, amountUSDT: number) {
  if (!LIVE) return { mock: true };
  const d = await decimals(usdt);
  const tx = await usdt.transfer(to, ethers.parseUnits(amountUSDT.toString(), d));
  return tx.wait();
}
