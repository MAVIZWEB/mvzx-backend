 // backend/src/services/tokenService.ts
import { ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config();

const LIVE = process.env.LIVE === "true";
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY!;
const BNB_RPC_URL = process.env.BNB_RPC_URL!;
const MVZX_TOKEN_CONTRACT = process.env.MVZX_TOKEN_CONTRACT!;

let provider: ethers.JsonRpcProvider | null = null;
let wallet: ethers.Wallet | null = null;
let mvzxContract: ethers.Contract | null = null;

if (LIVE) {
  provider = new ethers.JsonRpcProvider(BNB_RPC_URL);
  wallet = new ethers.Wallet(ADMIN_PRIVATE_KEY, provider);
  const abi = [
    "function transfer(address to, uint amount) public returns (bool)",
    "function balanceOf(address owner) view returns (uint256)"
  ];
  mvzxContract = new ethers.Contract(MVZX_TOKEN_CONTRACT, abi, wallet);
}

export async function sendMVZX(to: string, amountTokens: number) {
  // amountTokens is token units (Decimals 18)
  if (!LIVE) {
    // Simulation: return a mock tx hash
    return `SIM_TX_${Date.now()}`;
  }
  const amt = ethers.parseUnits(amountTokens.toString(), 18);
  const tx = await mvzxContract!.transfer(to, amt);
  await tx.wait();
  return tx.hash;
}

export async function getOnChainBalance(address: string) {
  if (!LIVE) return 0;
  const b = await mvzxContract!.balanceOf(address);
  return Number(ethers.formatUnits(b, 18));
}
