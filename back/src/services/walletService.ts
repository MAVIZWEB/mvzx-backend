import { ethers } from 'ethers';

const BNB_RPC_URL = process.env.BNB_RPC_URL!;
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY!;
const provider = new ethers.JsonRpcProvider(BNB_RPC_URL);
const adminWallet = new ethers.Wallet(ADMIN_PRIVATE_KEY, provider);

export function generatePlatformAddress() {
  // Create a new ephemeral wallet and return address & privateKey (NOTE: store private key in DB if you want user-controlled)
  const w = ethers.Wallet.createRandom();
  return { address: w.address, privateKey: w.privateKey };
}

export async function sendUSDT(to:string, amount:number, usdtContractAddress:string) {
  // uses ERC20 transfer via admin wallet
  const abi = [
    'function transfer(address to, uint amount) public returns (bool)'
  ];
  const contract = new ethers.Contract(usdtContractAddress, abi, adminWallet);
  const decimals = 6; // for USDT
  const value = BigInt(Math.floor(amount * (10 ** decimals)));
  const tx = await contract.transfer(to, value);
  return tx;
}
