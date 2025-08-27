  import { prisma } from '../lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';

const P = {
  MC: 0.162,  // 16.2% of MCB per leg (per your latest)
  JB: 0.10,
  NSP: 0.05,  // 5% per leg
  // The additional percentages in your P object (CR, LP, CP) are not used for blocking core flow,
  // but can be added similarly to Reward records when needed.
};

const TRANCHE = 6;
const STAGE_COMPLETE_LEGS = 62;
const MAX_STAGE = 20;

/**
 * Create k positions under user's principal and distribute rewards (MC/NSP per leg, JB per unit)
 */
export async function createPositionsAndDistribute(userId:number, k:number, mcbPerUnitUSDT:number) {
  // principal stage1
  let principal = await prisma.matrixPosition.findFirst({ where: { userId, stage: 1 }, orderBy: { id: 'asc' }});
  if(!principal) {
    principal = await prisma.matrixPosition.create({ data: { userId, stage: 1, parentId: null, depth: 0 }});
    await prisma.matrixPosition.update({ where: { id: principal.id }, data: { principalId: principal.id }});
  }

  // JB to buyer (stage1 only)
  if(mcbPerUnitUSDT && P.JB > 0) {
    const jbPerUnit = +(mcbPerUnitUSDT * P.JB).toFixed(8);
    await prisma.reward.create({
      data: { userId, positionId: principal.id, type: 'JB', stage: 1, amountUSDT: new Decimal(jbPerUnit * k) }
    });
  }

  for(let i=0;i<k;i++) {
    const newPos = await placeUnderSubtree(principal.id, userId);
    await creditUpline(newPos.id, mcbPerUnitUSDT);
  }
}

/** Breadth-first placement; stage 1 uses depth 2, later use depth 5 (2x5) */
async function placeUnderSubtree(principalId:number, userId:number) {
  const root = await prisma.matrixPosition.findUnique({ where: { id: principalId }});
  if(!root) throw new Error('principal not found');
  const queue = [root];
  const maxDepth = root.stage === 1 ? 2 : 5;
  while(queue.length) {
    const node = queue.shift()!;
    if(node.depth < maxDepth) {
      const children = await prisma.matrixPosition.findMany({ where: { parentId: node.id }, orderBy: { id: 'asc' }});
      if(children.length < 2) {
        const child = await prisma.matrixPosition.create({ data: { userId, principalId, stage: node.stage, parentId: node.id, depth: node.depth + 1 }});
        return child;
      } else {
        queue.push(...children);
      }
    }
  }
  // fallback: create new root position at same stage
  return prisma.matrixPosition.create({ data: { userId, principalId, stage: root.stage, parentId: null, depth: 0 }});
}

async function creditUpline(positionId:number, mcbPerUnitUSDT:number) {
  let node = await prisma.matrixPosition.findUnique({ where: { id: positionId }});
  let steps = 0;
  while(node && node.parentId && steps < 5) {
    const parent = await prisma.matrixPosition.findUnique({ where: { id: node.parentId }});
    if(!parent) break;
    const newLegCount = parent.legsFilled + 1;
    await prisma.matrixPosition.update({ where: { id: parent.id }, data: { legsFilled: { increment: 1 } }});
    // MC & NSP per leg
    const mc = +(mcbPerUnitUSDT * P.MC).toFixed(8);
    const nsp = +(mcbPerUnitUSDT * P.NSP).toFixed(8);
    await prisma.reward.createMany({
      data: [
        { userId: parent.userId, positionId: parent.id, type: 'MC', stage: parent.stage, legIndex: newLegCount, amountUSDT: new Decimal(mc) },
        { userId: parent.userId, positionId: parent.id, type: 'NSP', stage: parent.stage, legIndex: newLegCount, amountUSDT: new Decimal(nsp) }
      ]
    });
    // tranche check
    const tranches = Math.floor(newLegCount / TRANCHE);
    if(tranches > parent.tranchesPaid) {
      await prisma.matrixPosition.update({ where: { id: parent.id }, data: { tranchesPaid: tranches }});
      // tranche payout is just visible via reward entries; UI sums them
    }
    // completion
    if(newLegCount >= STAGE_COMPLETE_LEGS && parent.status !== 'COMPLETED') {
      await prisma.matrixPosition.update({ where: { id: parent.id }, data: { status: 'COMPLETED' }});
      if(parent.stage < MAX_STAGE) {
        await prisma.matrixPosition.create({ data: { userId: parent.userId, principalId: parent.principalId ?? parent.id, stage: parent.stage + 1, parentId: null, depth: 0 }});
      }
    }
    node = parent;
    steps++;
  }
}

/** Retry pending airdrops helper for admin */
export async function retryPendingAirdrops() {
  const pending = await prisma.purchase.findMany({ where: { txRef: 'AIRDROP_PENDING' }});
  for(const p of pending) {
    try {
      const user = await prisma.user.findUnique({ where: { id: p.userId }});
      if(!user) continue;
      const tx = await transferERC20(process.env.MVZX_TOKEN_CONTRACT || '', user.walletAddress, Number(p.mvzxMinted));
      await prisma.purchase.update({ where: { id: p.id }, data: { txRef: `AIRDROP:${tx}` }});
    } catch (e) {
      console.error('retry airdrop fail for', p.id, e);
    }
  }
}
