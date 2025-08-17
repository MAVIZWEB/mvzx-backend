 import { runFullSimulation } from "./simulation";

async function main() {
  try {
    const result = await runFullSimulation();
    console.log("Simulation completed successfully:", result);
  } catch (error) {
    console.error("Simulation failed:", error);
  }
}

main();
