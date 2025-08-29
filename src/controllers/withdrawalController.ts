 import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { sendUSDT } from '../utils/web3Utils';
const prisma = new PrismaClient();

export async function withdrawToNgn(req: Request, res: Response) {
  // uses Flutterwave payout API
  try {
    const { userId, amount, bankCode, accountNumber } = req.body;
    // implement Flutterwave transfer
    const FLW_SECRET = process.env.FLW_SECRET_KEY;
    // call Flutterwave disburse endpoint
    res.json({ ok: true, pending: true });
  } catch (e) { res.status(500).json({ error: String(e) }); }
}

export async function withdrawToUsdt(req: Request, res: Response) {
  try {
    const { userId, toAddress, amount } = req.body; // amount in USDT
    const wallet = await prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) return res.status(404).json({ error: 'wallet not found' });
    if (wallet.balanceUSDT < amount) return res.status(400).json({ error: 'insufficient' });
    // send USDT from company wallet
    const receipt = await sendUSDT(toAddress, amount);
    await prisma.wallet.update({ where: { id: wallet.id }, data: { balanceUSDT: { decrement: amount } } });
    res.json({ ok: true, tx: receipt.transactionHash || receipt.hash });
  } catch (e) { res.status(500).json({ error: String(e) }); }
}
