import { ethers } from "ethers";
import fetch from "node-fetch";

const USDT_CONTRACT_ADDRESS = process.env.USDT_CONTRACT_ADDRESS as string;
const INFURA_URL = process.env.INFURA_URL as string;
const RESERVE_WALLET = process.env.RESERVE_WALLET as string;

const abi = [
  "event Transfer(address indexed from, address indexed to, uint256 value)"
];

async function main() {
  const provider = new ethers.JsonRpcProvider(INFURA_URL);
  const contract = new ethers.Contract(USDT_CONTRACT_ADDRESS, abi, provider);

  console.log("Watching USDT transfers...");

  contract.on(
    "Transfer",
    async (
      from: string,
      to: string,
      value: ethers.BigNumberish,
      event: ethers.EventLog
    ) => {
      try {
        console.log(`Transfer detected: from=${from}, to=${to}, value=${value.toString()}`);

        // Only track transfers to the reserve wallet
        if (to.toLowerCase() === RESERVE_WALLET.toLowerCase()) {
          const amount = ethers.formatUnits(value, 6); // USDT uses 6 decimals

          console.log(`Deposit detected! Amount: ${amount} USDT`);

          // Notify backend
          await fetch(`${process.env.BACKEND_URL}/api/payments/usdt`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              from,
              to,
              amount,
              txHash: event.transactionHash
            }),
          });
        }
      } catch (err) {
        console.error("Error handling USDT transfer:", err);
      }
    }
  );
}

main().catch((err) => console.error("Watcher failed:", err));
