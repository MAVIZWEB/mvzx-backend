import { ethers } from 'ethers';

const RPC = process.env.BNB_RPC_URL!;
const provider = new ethers.JsonRpcProvider(RPC);
const adminPk = process.env.ADMIN_PRIVATE_KEY!;
export const adminWallet = new ethers.Wallet(adminPk, provider);

export function getContract(address: string, abi: any) {
  return new ethers.Contract(address, abi, provider);
}
export function getSignerContract(address: string, abi: any) {
  return new ethers.Contract(address, abi, adminWallet);
}

// Minimal ERC20 ABI (ethers v6 compatible fragments)
export const ERC20_ABI = [
  "function decimals() view returns (uint8)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address owner) view returns (uint256)"
];

export async function transferERC20(tokenAddress: string, to: string, amountFloat: number) {
  if (!tokenAddress || !to) throw new Error("tokenAddress and to required");
  const contract = getSignerContract(tokenAddress, ERC20_ABI);
  const decimals: number = Number(await contract.decimals());
  const amountBN = ethers.parseUnits(String(amountFloat), decimals);
  const tx = await contract.transfer(to, amountBN);
  await tx.wait();
  return tx.hash;
}
export async function getERC20Balance(tokenAddress: string, addr: string) {
  const contract = getContract(tokenAddress, ERC20_ABI);
  const decimals = Number(await contract.decimals());
  const raw = await contract.balanceOf(addr);
  return Number(ethers.formatUnits(raw, decimals));
}
