import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { hashPin, verifyPin, randomAddr, makeReferralCode } from '../lib/crypto';
import jwt from 'jsonwebtoken';
import { transferERC20 } from '../lib/eth';

export async function signup(req: Request, res: Response) {
  try {
    const { email, pin } = req.body;
    if(!email || !pin || String(pin).length !== 4) return res.status(400).json({ error: 'email+4-digit pin required' });
    const pinHash = hashPin(String(pin), process.env.PIN_SALT || '');
    const walletAddress = randomAddr();
    const referralCode = makeReferralCode();
    const user = await prisma.user.create({ data: { email, pinHash, walletAddress, referralCode }});
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET || '', { expiresIn: '7d' });

    // Airdrop 0.5 MVZX
    const airdropAmount = 0.5;
    let airdropTx: string | null = null;
    try {
      airdropTx = await transferERC20(process.env.MVZX_TOKEN_CONTRACT || '', walletAddress, airdropAmount);
      await prisma.purchase.create({
        data: {
          userId: user.id,
          source: 'AIRDROP',
          txRef: `AIRDROP:${airdropTx}`,
          usdtAmount: '0',
          ngnAmount: '0',
          mvzxMinted: airdropAmount.toString(),
          multiplesCount: 0,
          remainderUnits: '0',
          mcbAmount: '0'
        }
      });
    } catch (err) {
      console.error('Airdrop failed:', err);
      await prisma.purchase.create({
        data: {
          userId: user.id,
          source: 'MANUAL',
          txRef: 'AIRDROP_PENDING',
          usdtAmount: '0',
          ngnAmount: '0',
          mvzxMinted: airdropAmount.toString(),
          multiplesCount: 0,
          remainderUnits: '0',
          mcbAmount: '0'
        }
      });
    }

    return res.json({ token, user: { id: user.id, email: user.email, walletAddress: user.walletAddress }, airdrop: airdropTx ? { success:true, tx: airdropTx } : { success:false } });
  } catch (e:any) {
    console.error(e);
    return res.status(500).json({ error: e.message || 'server error' });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, pin } = req.body;
    const user = await prisma.user.findUnique({ where: { email }});
    if(!user) return res.status(404).json({ error: 'user not found' });
    if(!verifyPin(String(pin), process.env.PIN_SALT || '', user.pinHash)) return res.status(401).json({ error: 'bad pin' });
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET || '', { expiresIn: '7d' });
    return res.json({ token, user: { id: user.id, email: user.email, walletAddress: user.walletAddress }});
  } catch (e:any) {
    console.error(e);
    return res.status(500).json({ error: e.message || 'server error' });
  }
}
