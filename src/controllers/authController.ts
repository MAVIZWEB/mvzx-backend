 import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { sign } from '../utils/jwt';
import { createWallet } from '../utils/web3Utils';

const prisma = new PrismaClient();
const SALT = process.env.PIN_SALT || 'amabeth 41';

export async function signup(req: Request, res: Response) {
  try {
    const { email, pin, referrer } = req.body;
    if (!pin || String(pin).length !== 4) return res.status(400).json({ error: 'PIN must be 4 digits' });
    const hash = await bcrypt.hash(pin + SALT, 12);
    const user = await prisma.user.create({ data: { email, pinHash: hash } });

    // create wallet
    const w = await createWallet();
    await prisma.wallet.create({ data: { address: w.address, userId: user.id, balanceMVZx: 0 } });

    // credit free 0.5 MVZx tokens (send on-chain)
    await prisma.wallet.update({ where: { userId: user.id }, data: { balanceMVZx: { increment: 0.5 } } });

    // optional referral
    if (referrer) {
      await prisma.referral.create({ data: { referrerId: Number(referrer), refereeId: user.id, reward: 0 } });
    }

    const token = sign({ uid: user.id });
    res.json({ token, userId: user.id, walletAddress: w.address });
  } catch (e) { res.status(500).json({ error: String(e) }); }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, pin } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: 'user not found' });
    const ok = await bcrypt.compare(pin + SALT, user.pinHash);
    if (!ok) return res.status(401).json({ error: 'invalid pin' });
    const token = sign({ uid: user.id });
    const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
    res.json({ token, userId: user.id, walletAddress: wallet?.address });
  } catch (e) { res.status(500).json({ error: String(e) }); }
}
