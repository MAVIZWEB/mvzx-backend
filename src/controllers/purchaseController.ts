import { Request, Response } from 'express';
import { verifyOnchainTx, recordOnchainPurchase, manualInitPurchase, retryPendingAirdrops } from '../services/purchaseService';

export async function processOnchainPurchase(req: Request, res: Response) {
  try {
    const uid = (req as any).user.id;
    const { txHash } = req.body;
    if(!txHash) return res.status(400).json({ error: 'txHash required' });
    const txData = await verifyOnchainTx(txHash);
    if(!txData.success) return res.status(400).json({ error: 'tx invalid or insufficient' });
    const rec = await recordOnchainPurchase(uid, txData.usdtAmount, txHash, txData.mvzxMinted, txData.multiples);
    return res.json(rec);
  } catch (e:any) { console.error(e); return res.status(500).json({ error: e.message || 'server error' }); }
}

export async function flutterwaveWebhook(req: Request, res: Response) {
  try {
    // Validate FLW signature here (omitted for brevity — implement HMAC using FLW_SECRET_KEY)
    const event = req.body;
    if(event && event.status === 'successful') {
      const userId = Number(event.meta?.userId);
      if(userId) {
        await manualInitPurchase(userId, Number(event.amount), event.tx_ref);
      }
    }
    return res.status(200).send('ok');
  } catch (e:any) { console.error(e); return res.status(500).send('err'); }
}

export async function manualInit(req: Request, res: Response) {
  try {
    const uid = (req as any).user.id;
    const { ngnAmount, ref, evidenceUrl } = req.body;
    const rec = await manualInitPurchase(uid, Number(ngnAmount), String(ref), evidenceUrl);
    return res.json(rec);
  } catch (e:any) { console.error(e); return res.status(500).json({ error: e.message || 'server error' }); }
}

// admin endpoint
export async function retryAirdrops(req: Request, res: Response) {
  try {
    // optionally protect by admin token in env
    await retryPendingAirdrops();
    return res.json({ success: true });
  } catch (e:any) { console.error(e); return res.status(500).json({ error: e.message || 'server error' }); }
}
