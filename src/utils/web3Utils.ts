 import { ethers } from 'ethers';
import MVZX_ABI from '../abis/mvzx.json';
import USDT_ABI from '../abis/erc20.json';

const provider = new ethers.JsonRpcProvider(process.env.BNB_RPC_URL);
const adminPk = process.env.ADMIN_PRIVATE_KEY as string;
const adminWallet = new ethers.Wallet(adminPk, provider);

export const mvzx = new ethers.Contract(process.env.MVZX_TOKEN_CONTRACT as string, MVZX_ABI, adminWallet);
export const usdt = new ethers.Contract(process.env.USDT_CONTRACT as string, USDT_ABI, adminWallet);

export async function createWallet() {
  const w = ethers.Wallet.createRandom();
  // do not fund automatically; only return address and privateKey to admin secure store if needed
  return { address: w.address, privateKey: w.privateKey };
}

export async function sendMVZX(to: string, amountTokens: number) {
  const decimals = 18;
  const amount = ethers.parseUnits(String(amountTokens), decimals);
  const tx = await mvzx.transfer(to, amount);
  const receipt = await tx.wait();
  return receipt;
}

export async function sendUSDT(to: string, amount: number) {
  const decimals = 18;
  const amt = ethers.parseUnits(String(amount), decimals);
  const tx = await usdt.transfer(to, amt);
  const receipt = await tx.wait();
  return receipt;
}

export async function getMVZXBalance(address: string) {
  const b = await mvzx.balanceOf(address);
  return Number(ethers.formatUnits(b, 18));
}
