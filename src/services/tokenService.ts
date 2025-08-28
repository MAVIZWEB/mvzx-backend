// backend/services/tokenService.ts
import { ethers } from "ethers";

/**
 * Sends BEP-20 token (MVZX or USDT) from company wallet to user wallet
 * @param tokenType "MVZX" or "USDT"
 * @param toWallet recipient address
 * @param amount amount to send (in token units, e.g., 1.5 MVZX)
 */
export const sendToken = async (
  tokenType: "MVZX" | "USDT",
  toWallet: string,
  amount: number
): Promise<string> => {
  try {
    const provider = new ethers.JsonRpcProvider(process.env.BNB_RPC_URL);
    const wallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY!, provider);

    const tokenAddress =
      tokenType === "MVZX"
        ? process.env.MVZX_TOKEN_CONTRACT
        : process.env.USDT_CONTRACT;

    if (!tokenAddress) throw new Error(`${tokenType} token contract not set in env`);

    const abi = [
      "function transfer(address to, uint256 amount) public returns (bool)",
      "function decimals() public view returns (uint8)",
    ];

    const contract = new ethers.Contract(tokenAddress, abi, wallet);

    const decimals: number = await contract.decimals();
    const adjustedAmount = ethers.parseUnits(amount.toString(), decimals);

    const tx = await contract.transfer(toWallet, adjustedAmount);
    await tx.wait();

    console.log(`${tokenType} transfer completed: ${amount} → ${toWallet}`);
    return tx.hash;
  } catch (err: any) {
    console.error("Token transfer failed:", err.message);
    throw new Error(`Failed to send ${tokenType}: ${err.message}`);
  }
};

/**
 * Helper functions
 */
export const sendMVZX = (toWallet: string, amount: number) =>
  sendToken("MVZX", toWallet, amount);

export const sendUSDT = (toWallet: string, amount: number) =>
  sendToken("USDT", toWallet, amount);
