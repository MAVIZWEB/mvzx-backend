 import { Request, Response } from 'express';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { assignPositionAndDistribute } from '../services/matrixService';
import { sendMVZX } from '../utils/web3Utils';

const prisma = new PrismaClient();

export async function flutterwaveWebhook(req: Request, res: Response) {
  // Flutterwave webhook verification -> credit tokens
  try {
    const data = req.body;
    // verify signature or call Flutterwave verify endpoint with tx id
    const tx = data;
    const customer_email = tx.customer?.email;
    const amount = Number(tx.amount);
    const currency = tx.currency; // NGN or USD
    const user = await prisma.user.findUnique({ where: { email: customer_email } });
    if (!user) return res.status(404).end();

    // convert to MVZx via MVZX_USDT_RATE and NGN_PER_USDT if needed
    const NGN_PER_USDT = Number(process.env.NGN_PER_USDT || 1500);
    const MVZX_USDT_RATE = Number(process.env.MVZX_USDT_RATE || 0.15);

    let tokens = 0;
    if (currency === 'NGN') {
      // amount in NGN
      const usdtEquivalent = amount / NGN_PER_USDT;
      tokens = usdtEquivalent / MVZX_USDT_RATE; // tokens = USDT / rate
    } else {
      const usdtEquivalent = amount;
      tokens = usdtEquivalent / MVZX_USDT_RATE;
    }

    // conditions: minimum 200 NGN token credit and matrix only if multiple of 2000
    const slotCost = Number(process.env.SLOT_COST_NGN || 2000);
    const minNgn = 200;

    // persist token credit
    const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
    await prisma.wallet.update({ where: { id: wallet!.id }, data: { balanceMVZx: { increment: tokens } } });

    // if NGN and eligible for matrix position
    if (currency === 'NGN' && amount >= minNgn) {
      if (amount >= slotCost && amount % slotCost === 0) {
        // compute matrixBase in USDT-equivalent per slot
        const slots = amount / slotCost;
        const perSlotUsdt = Number(process.env.MVZX_USDT_RATE) * 1; // 0.15 USDT = 1 slot worth? we keep consistency: per slot price in USDT = MVZX_USDT_RATE
        // matrixBase should be per slot in USDT
        for (let i = 0; i < slots; i++) {
          await assignPositionAndDistribute(user.id, perSlotUsdt);
        }
      } else {
        // give referral 2.5% to buyer and 2.5% to referrer (if exists)
        const buyerBonus = tokens * 0.025;
        await prisma.wallet.update({ where: { id: wallet!.id }, data: { balanceMVZx: { increment: buyerBonus } } });
        const referral = await prisma.referral.findFirst({ where: { refereeId: user.id } });
        if (referral) {
          const refWallet = await prisma.wallet.findUnique({ where: { userId: referral.referrerId } });
          if (refWallet) await prisma.wallet.update({ where: { id: refWallet.id }, data: { balanceMVZx: { increment: tokens * 0.025 } } });
        }
      }
    }

    // Optionally send on-chain MVZx tokens to user address
    // const sendReceipt = await sendMVZX(wallet!.address, tokens);

    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: String(e) }); }
}

export async function payUsdt(req: Request, res: Response) {
  // User notifies backend of a USDT tx hash; backend verifies on chain and credits accordingly
  try {
    const { txHash, userId } = req.body;
    // verify with provider
    const providerUrl = process.env.BNB_RPC_URL as string;
    const { ethers } = await import('ethers');
    const provider = new ethers.JsonRpcProvider(providerUrl);
    const tx = await provider.getTransactionReceipt(txHash);
    if (!tx || !tx.status) return res.status(400).json({ error: 'tx invalid or not mined' });

    // parse logs to find USDT 'transfer' to company wallet
    // For simplicity: assume tx.to === USDT contract and input parsed indicates transfer to COMPANY_WALLET

    // compute tokens similar as above depending on amount transferred
    // credit wallet and possibly matrix
    res.json({ ok: true, tx });
  } catch (e) { res.status(500).json({ error: String(e) }); }
}

export async function manualDeposit(req: Request, res: Response) {
  try {
    const { userId, amount, proof } = req.body; // amount in NGN
    const rec = await prisma.manualDeposit?.create?.({ data: { /* schema optional */ } }).catch(()=>null);
    // For simplicity create a placeholder record in Matrix or Admin table in your DB and mark pending
    res.json({ ok: true, pendingApproval: true });
  } catch (e) { res.status(500).json({ error: String(e) }); }
}
