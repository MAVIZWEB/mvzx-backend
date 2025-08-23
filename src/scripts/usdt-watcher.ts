 // scripts/usdt-watcher.ts
import { ethers } from "ethers";
import fetch from "node-fetch";

const PROVIDER_URL = process.env.BSC_RPC || "https://bsc-dataseed.binance.org/";
const provider = new ethers.providers.JsonRpcProvider(PROVIDER_URL);
const USDT = process.env.USDT_CONTRACT_ADDRESS!;
const RECV = process.env.USDT_RECEIVE_WALLET!;
const ABI = ["event Transfer(address indexed from, address indexed to, uint256 value)"];
const contract = new ethers.Contract(USDT, ABI, provider);

const LAST_BLOCK_KEY = "last_block_usdt";

async function postNotify(userId:number, amount:number, txHash:string){
  const url = `${process.env.PUBLIC_BASE}/payments/usdt/notify`;
  await fetch(url, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ userId, amountUSDT: amount, txHash }) });
}

async function start() {
  let fromBlock = Number(process.env.START_BLOCK || 0);
  console.log("USDT watcher starting at block", fromBlock);
  contract.on("Transfer", async (from, to, value, event) => {
    try {
      if (String(to).toLowerCase() !== RECV.toLowerCase()) return;
      const amount = Number(ethers.utils.formatUnits(value, 6)); // USDT uses 6 decimals
      console.log("Incoming USDT:", amount, "from", from, "tx", event.transactionHash);

      // Attempt to find user in DB by wallet = from (call your backend)
      const lookup = await fetch(`${process.env.PUBLIC_BASE}/public/lookup-wallet?wallet=${from}`);
      const j = await lookup.json();
      if (j?.userId) {
        await postNotify(j.userId, amount, event.transactionHash);
        console.log("Notified backend for user", j.userId);
      } else {
        console.log("No user mapping for", from);
      }
    } catch (e) { console.error(e); }
  });
}

start().catch(console.error);
