 import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider(process.env.BNB_RPC_URL);
const wallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY!, provider);
const mvzxAbi = [
  "function transfer(address to, uint amount) public returns(bool)",
  "function balanceOf(address owner) view returns(uint)"
];
const mvzxToken = new ethers.Contract(process.env.MVZX_TOKEN_CONTRACT!, mvzxAbi, wallet);

export async function transferMVZX(to: string, amount: number) {
  const tx = await mvzxToken.transfer(to, ethers.parseUnits(amount.toString(), 18));
  await tx.wait();
  return tx.hash;
}

export async function getMVZXBalance(address: string) {
  return Number(ethers.formatUnits(await mvzxToken.balanceOf(address), 18));
}
