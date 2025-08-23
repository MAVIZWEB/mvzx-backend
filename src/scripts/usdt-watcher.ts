 import { ethers } from "ethers";
import axios from "axios";

const PROVIDER_URL = process.env.BSC_RPC || "https://bsc-dataseed.binance.org/";
const provider = new ethers.providers.JsonRpcProvider(PROVIDER_URL);

const USDT = (process.env.USDT_CONTRACT_ADDRESS || "0x55d398326f99059fF775485246999027B3197955");
const RECV = (process.env.USDT_RECEIVE_WALLET || "").toLowerCase();
const ABI = ["event Transfer(address indexed from, address indexed to, uint256 value)"];
const contract = new ethers.Contract(USDT, ABI, provider);

async function postNotify(userId: number, amount: number, txHash: string) {
  try {
    const url = `${process.env.PUBLIC_BASE}/payments/usdt/notify`;
    await axios.post(url, { userId, amountUSDT: amount, txHash });
    console.log("Notified backend:", userId, amount);
  } catch (e:any) {
    console.error("Notify error:", e.message || e);
  }
}

console.log("USDT watcher starting. Listening for transfers to", RECV);

contract.on("Transfer", async (from: any, to: any, value: any, event: any) => {
  try {
    if (!RECV) return;
    if (String(to).toLowerCase() !== RECV.toLowerCase()) return;
    const amount = Number(ethers.utils.formatUnits(value, 6)); // USDT uses 6 decimals
    console.log("Incoming USDT:", amount, "from", from, "tx", event.transactionHash);

    // Lookup user by wallet from backend public lookup
    const lookupUrl = `${process.env.PUBLIC_BASE}/public/lookup-wallet?wallet=${from}`;
    const resp = await axios.get(lookupUrl);
    const j = resp.data;
    if (j?.found && j.userId) {
      await postNotify(j.userId, amount, event.transactionHash);
    } else {
      console.log("No user mapping for", from);
    }
  } catch (e:any) {
    console.error("Watcher error:", e.message || e);
  }
});
