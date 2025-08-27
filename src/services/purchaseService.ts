import { prisma } from '../lib/prisma';
import { adminWallet } from '../lib/eth';
import { transferERC20 } from '../lib/eth';
import { createPositionsAndDistribute, retryPendingAirdrops } from './matrixService';
import { ethers } from 'ethers';

// verify onchain tx and parse USDT transfer to COMPANY_WALLET
export async function verifyOnchainTx(txHash: string) {
  try {
    const provider = adminWallet.provider;
    const receipt = await provider.getTransactionReceipt(txHash);
    if(!receipt || !receipt.logs) return { success:false };
    const usdtAddr = (process.env.USDT_CONTRACT || '').toLowerCase();
    const company = (process.env.COMPANY_WALLET || '').toLowerCase();
    const iface = new ethers.Interface([
      "event Transfer(address indexed from, address indexed to, uint256 value)"
    ]);
    let usdtAmount = 0;
    for(const l of receipt.logs) {
      if(l.address.toLowerCase() !== usdtAddr) continue;
      try {
        const parsed = iface.parseLog(l);
        if(parsed && parsed.args && parsed.args.to && parsed.args.to.toLowerCase() === company) {
          const val = parsed.args.value;
          usdtAmount = Number(ethers.formatUnits(val, 18));
          break;
        }
      } catch(e) { continue; }
    }
    if(usdtAmount <= 0) return { success:false };
    const rate = Number(process.env.MVZX_USDT_RATE || '0.15');
    const mvzxMinted = usdtAmount / rate;
    const multiples = Math.floor(usdtAmount / 1.5);
    return { success:true, usdtAmount, mvzxMinted, multiples };
  } catch (e:any) { console.error(e); return { success:false }; }
}

export async function recordOnchainPurchase(userId:number, usdtAmount:number, txRef:string, mvzxMinted:number, multiples:number) {
  const mcbPerUnit = 1.5 * 0.5; // 0.75 USDT per unit
  const mcbTotal = multiples * mcbPerUnit;
  const p = await prisma.purchase.create({
    data: {
      userId,
      source: 'ONCHAIN',
      txRef,
      usdtAmount: usdtAmount.toString(),
      ngnAmount: '0',
      mvzxMinted: mvzxMinted.toString(),
      multiplesCount: multiples,
      remainderUnits: (usdtAmount / 1.5 - multiples).toString(),
      mcbAmount: mcbTotal.toString()
    }
  });
  if(multiples > 0) {
    await createPositionsAndDistribute(userId, multiples, mcbPerUnit);
  }
  return p;
}

export async function manualInitPurchase(userId:number, ngnAmount:number, ref:string, evidenceUrl?:string) {
  const slotCost = Number(process.env.SLOT_COST_NGN || 2000);
  const units = Math.floor(ngnAmount / slotCost);
  const mvzxPerUnit = Math.round((1.5 / (Number(process.env.MVZX_USDT_RATE || 0.15))) * 1000000) / 1000000; // safe approx
  const mvzxMinted = units * 10 + ((ngnAmount % slotCost) ? ((ngnAmount % slotCost) / (slotCost/10)) : 0);
  const mcbPerUnitUsdt = 0.75;
  const p = await prisma.purchase.create({
    data: {
      userId,
      source: 'MANUAL',
      txRef: ref,
      usdtAmount: '0',
      ngnAmount: ngnAmount.toString(),
      mvzxMinted: mvzxMinted.toString(),
      multiplesCount: units,
      remainderUnits: ((ngnAmount/slotCost) - units).toString(),
      mcbAmount: (units * mcbPerUnitUsdt).toString()
    }
  });
  if(units > 0) {
    await createPositionsAndDistribute(userId, units, mcbPerUnitUsdt);
  }
  return p;
}

export { retryPendingAirdrops };
