/**
 * MVZX Single-file Backend (backend.js)
 * - Node.js (CommonJS) single-file server
 * - Auto-creates Postgres tables on first run
 * - Watches USDT transfers to COMPANY_WALLET
 * - Implements signup/login, purchases (USDT, Flutterwave, manual), matrix engine,
 *   staking (150 days), withdrawals, admin payout endpoints.
 *
 * Dependencies: express pg ethers axios bcryptjs jsonwebtoken cors body-parser
 *
 * Run: node backend.js
 *
 * IMPORTANT: set the environment variables exactly as provided by you on Render.
 */

/* eslint-disable no-console */
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { Pool } = require("pg");
const { ethers } = require("ethers");
const axios = require("axios");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// ---- ENV (use values you provided) ----
const {
  PORT = 10000,
  DATABASE_URL,
  JWT_SECRET,
  PIN_SALT,
  ADMIN_PRIVATE_KEY,
  COMPANY_WALLET,
  MVZX_TOKEN_CONTRACT,
  USDT_CONTRACT,
  BNB_RPC_URL,
  MVZX_USDT_RATE = "0.15",
  NGN_PER_USDT = "1500",
  SLOT_COST_NGN = "2000",
  FLW_PUBLIC_KEY,
  FLW_SECRET_KEY,
  FLW_ENCRYPTION_KEY,
  LIVE = "false",
  FRONTEND_URL,
  CORS_ORIGIN = "*",
} = process.env;

// basic validation of critical env vars
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required in env");
  process.exit(1);
}
if (!JWT_SECRET) {
  console.error("JWT_SECRET is required");
  process.exit(1);
}
if (!ADMIN_PRIVATE_KEY || !COMPANY_WALLET || !MVZX_TOKEN_CONTRACT || !USDT_CONTRACT || !BNB_RPC_URL) {
  console.warn("Blockchain env vars (ADMIN_PRIVATE_KEY, COMPANY_WALLET, MVZX_TOKEN_CONTRACT, USDT_CONTRACT, BNB_RPC_URL) should be set for on-chain operations. Continuing in offline mode.");
}

// ---- Postgres pool ----
const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

// ---- Ethers provider & admin wallet ----
let provider, adminWallet, mvzxContract, usdtContract;
try {
  provider = new ethers.JsonRpcProvider(BNB_RPC_URL);
  adminWallet = new ethers.Wallet(ADMIN_PRIVATE_KEY, provider);
  const erc20Abi = [
    "function transfer(address to, uint256 value) returns (bool)",
    "function balanceOf(address) view returns (uint256)",
    "event Transfer(address indexed from, address indexed to, uint256 value)",
    "function decimals() view returns (uint8)",
  ];
  mvzxContract = new ethers.Contract(MVZX_TOKEN_CONTRACT, erc20Abi, adminWallet);
  usdtContract = new ethers.Contract(USDT_CONTRACT, erc20Abi, provider);
} catch (e) {
  console.warn("Ethers not fully initialized: ", e.message || e);
}

// ---- Matrix percentages (per-leg base) ----
const P = {
  MC: 0.15,
  JB: 0.10, // only stage 1
  NSP: 0.35,
  CR: 0.20,
  LP: 0.10, // +0.10 for stage>=2 (effectively 0.20)
  CP: 0.10,
};

// ---- Utility helpers ----
const app = express();
app.use(cors({ origin: CORS_ORIGIN === "*" ? "*" : CORS_ORIGIN }));
app.use(bodyParser.json());

// simple auth middleware (JWT)
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: "no token" });
  const token = auth.split(" ")[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.id;
    next();
  } catch (e) {
    return res.status(401).json({ error: "invalid token" });
  }
}

// run SQL to create tables if not exist
async function ensureTables() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // users
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        phone TEXT UNIQUE,
        email TEXT,
        pin_hash TEXT,
        referrer_id INT,
        created_at TIMESTAMP DEFAULT now()
      );
    `);
    // wallets (custodial)
    await client.query(`
      CREATE TABLE IF NOT EXISTS wallets (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        address TEXT UNIQUE,
        private_key TEXT,
        token_balance NUMERIC DEFAULT 0,
        ngn_balance NUMERIC DEFAULT 0,
        created_at TIMESTAMP DEFAULT now()
      );
    `);
    // purchases
    await client.query(`
      CREATE TABLE IF NOT EXISTS purchases (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE SET NULL,
        amount_ngn INT DEFAULT 0,
        amount_usdt NUMERIC DEFAULT 0,
        tokens_granted NUMERIC DEFAULT 0,
        status TEXT DEFAULT 'PENDING',
        payment_method TEXT,
        referrer_id INT,
        tx_hash TEXT,
        created_at TIMESTAMP DEFAULT now()
      );
    `);
    // matrix
    await client.query(`
      CREATE TABLE IF NOT EXISTS matrix (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        stage INT,
        position INT DEFAULT 0,
        earnings NUMERIC DEFAULT 0,
        pending_payout NUMERIC DEFAULT 0,
        created_at TIMESTAMP DEFAULT now()
      );
    `);
    // stakes
    await client.query(`
      CREATE TABLE IF NOT EXISTS stakes (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        amount NUMERIC,
        start_at TIMESTAMP,
        maturity_at TIMESTAMP,
        claimed BOOLEAN DEFAULT false
      );
    `);
    // withdrawals
    await client.query(`
      CREATE TABLE IF NOT EXISTS withdrawals (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        amount NUMERIC,
        method TEXT,
        details TEXT,
        status TEXT DEFAULT 'PENDING',
        created_at TIMESTAMP DEFAULT now()
      );
    `);
    await client.query("COMMIT");
    console.log("Tables ensured");
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("Error ensuring tables", e);
  } finally {
    client.release();
  }
}

// create custodial wallet and return address (store private key in DB — use KMS in production)
async function createCustodialWallet(userId) {
  const wallet = ethers.Wallet.createRandom();
  await pool.query(
    `INSERT INTO wallets (user_id, address, private_key, token_balance, ngn_balance) VALUES ($1,$2,$3,0,0) ON CONFLICT (user_id) DO NOTHING`,
    [userId, wallet.address, wallet.privateKey]
  );
  return wallet.address;
}

// fetch wallet by user id
async function getWalletByUser(userId) {
  const r = await pool.query("SELECT * FROM wallets WHERE user_id=$1", [userId]);
  return r.rows[0];
}

// credit tokens to user wallet (DB only; on-chain optional)
async function creditTokensToUser(userId, tokens) {
  await pool.query("UPDATE wallets SET token_balance = token_balance + $1 WHERE user_id=$2", [tokens, userId]);
}

// ---- Matrix engine: assignPositionAndDistribute ----
// matrixBase is per-slot base in NGN-equivalent (we'll pass slotCost)
async function assignPositionAndDistribute(userId, matrixBase) {
  // get latest stage for user
  const curRes = await pool.query("SELECT * FROM matrix WHERE user_id=$1 ORDER BY stage DESC LIMIT 1", [userId]);
  let cur = curRes.rows[0];
  if (!cur) {
    const ins = await pool.query("INSERT INTO matrix (user_id, stage, position, earnings, pending_payout) VALUES ($1,1,0,0,0) RETURNING *", [userId]);
    cur = ins.rows[0];
  }
  const stage = cur.stage;
  const jbPct = stage === 1 ? P.JB : 0;
  const lpPct = stage === 1 ? P.LP : P.LP + P.JB; // stage>=2 LP gets JB added => LP=0.20

  const perLeg = {
    MC: Number((matrixBase * P.MC).toFixed(8)),
    JB: Number((matrixBase * jbPct).toFixed(8)),
    NSP: Number((matrixBase * P.NSP).toFixed(8)),
    CR: Number((matrixBase * P.CR).toFixed(8)),
    LP: Number((matrixBase * lpPct).toFixed(8)),
    CP: Number((matrixBase * P.CP).toFixed(8)),
  };

  // each new purchase unit creates legsToCredit = 2
  const legsToCredit = 2;
  const rewards = {
    MC: perLeg.MC * legsToCredit,
    JB: perLeg.JB * legsToCredit,
    NSP: perLeg.NSP * legsToCredit,
    CR: perLeg.CR * legsToCredit,
    LP: perLeg.LP * legsToCredit,
    CP: perLeg.CP * legsToCredit,
  };

  // credit visible earnings (MC + NSP) and add others to pending payout
  await pool.query(
    "UPDATE matrix SET earnings = earnings + $1, pending_payout = pending_payout + $2, position = position + 1 WHERE id = $3",
    [rewards.MC + rewards.NSP, rewards.LP + rewards.CP + rewards.CR + rewards.JB, cur.id]
  );

  // if position >=2 -> stage completed
  const updated = await pool.query("SELECT * FROM matrix WHERE id=$1", [cur.id]);
  const updatedRow = updated.rows[0];
  let newStage = stage;
  if (updatedRow.position >= 2 && stage < 20) {
    // create next stage for user
    const next = await pool.query("INSERT INTO matrix (user_id, stage, position, earnings, pending_payout) VALUES ($1, $2, 0, 0, 0) RETURNING *", [userId, stage + 1]);
    newStage = stage + 1;
    // pending_payout remains for admin to payout as lumpsum
  } else if (updatedRow.position >= 2 && stage >= 20) {
    // at stage 20 we don't auto recycle
    newStage = stage;
  }

  return { success: true, stage, newStage, rewards, legsFilled: legsToCredit };
}

// admin triggers payout for a matrix row (transfer pending_payout to user's token balance and zero pending_payout)
async function adminPayoutMatrix(matrixId) {
  const m = await pool.query("SELECT * FROM matrix WHERE id=$1", [matrixId]);
  if (!m.rows[0]) throw new Error("matrix not found");
  const row = m.rows[0];
  const pending = Number(row.pending_payout) || 0;
  if (pending <= 0) return { success: true, paid: 0 };
  // credit user's token balance
  await pool.query("UPDATE wallets SET token_balance = token_balance + $1 WHERE user_id=$2", [pending, row.user_id]);
  await pool.query("UPDATE matrix SET pending_payout = 0 WHERE id=$1", [matrixId]);
  return { success: true, paid: pending };
}

// ---- USDT watch: listens for Transfer(to=COMPANY_WALLET) events and credits purchases ----
async function startUSDTWatcher() {
  if (!usdtContract || !provider || !COMPANY_WALLET) {
    console.warn("USDT watcher not started — missing on-chain config");
    return;
  }
  try {
    // get decimals (some tokens use 18)
    let decimals = 18;
    try {
      decimals = Number(await usdtContract.decimals());
    } catch (e) {
      decimals = 18;
    }

    const filter = usdtContract.filters.Transfer(null, COMPANY_WALLET);
    usdtContract.on(filter, async (from, to, value, event) => {
      try {
        const amount = Number(ethers.formatUnits(value, decimals)); // USDT amount (decimal)
        console.log("USDT received from", from, "amount", amount, "tx", event.transactionHash);

        // match wallet by address
        const userRes = await pool.query("SELECT user_id FROM wallets WHERE address=$1", [from]);
        const userId = userRes.rows[0] ? userRes.rows[0].user_id : null;

        // compute tokens
        const mvzxPerUsdtRate = Number(MVZX_USDT_RATE || "0.15"); // USDT per token?
        // you indicated MVZX_USDT_RATE=0.15 earlier meaning 0.15 USDT per token => tokens = amount / rate
        const tokens = Number((amount / mvzxPerUsdtRate).toFixed(8));

        // create purchase record and approve it
        await pool.query(
          `INSERT INTO purchases (user_id, amount_ngn, amount_usdt, tokens_granted, status, payment_method, tx_hash) VALUES ($1,0,$2,$3,'APPROVED','USDT',$4)`,
          [userId, amount, tokens, event.transactionHash]
        );

        if (userId) {
          // credit tokens to wallet
          await creditTokensToUser(userId, tokens);

          // check NGN-equivalent for slot eligibility
          const ngnEquivalent = amount * Number(NGN_PER_USDT || 1500);
          const slotCost = Number(SLOT_COST_NGN || 2000);
          const eligible = Math.floor(ngnEquivalent / slotCost);
          for (let i = 0; i < eligible; i++) {
            await assignPositionAndDistribute(userId, slotCost);
          }
          // if not eligible (<1 slot) -> give 2.5% buyer and 2.5% referrer? (we need referrer info — omitted for onchain)
          if (eligible < 1) {
            const bonus = tokens * 0.025;
            await pool.query("UPDATE wallets SET token_balance = token_balance + $1 WHERE user_id=$2", [bonus, userId]);
          }
        } else {
          console.warn("USDT to company wallet from unknown address", from);
        }
      } catch (err) {
        console.error("Error processing USDT transfer event", err);
      }
    });
    console.log("USDT watcher started, listening for transfers to", COMPANY_WALLET);
  } catch (e) {
    console.error("Failed to start USDT watcher", e);
  }
}

// ---- On-chain send of MVZX tokens (admin) ----
async function sendMVZXOnChain(to, amountTokens) {
  if (!mvzxContract || LIVE !== "true") {
    throw new Error("On-chain transfers disabled or not configured (set LIVE=true and ensure contract/wallet config)");
  }
  // convert tokens to decimals (assume 18)
  const amount = ethers.parseUnits(String(amountTokens), 18);
  const tx = await mvzxContract.transfer(to, amount);
  await tx.wait();
  return tx.hash;
}

// ---- Routes ----

// health
app.get("/", (req, res) => res.json({ ok: true, service: "mvzx-backend-singlefile" }));

// signup: phone + 4-digit PIN (+ optional referrer id)
app.post("/api/signup", async (req, res) => {
  try {
    const { phone, pin, referrerId } = req.body;
    if (!phone || !pin || !/^\d{4}$/.test(String(pin))) return res.status(400).json({ error: "phone and 4-digit pin required" });

    // hash pin
    const pinHash = await bcrypt.hash(String(pin) + (PIN_SALT || ""), 10);
    const userInsert = await pool.query("INSERT INTO users (phone, pin_hash, referrer_id) VALUES ($1,$2,$3) RETURNING *", [phone, pinHash, referrerId || null]);
    const user = userInsert.rows[0];

    // create custodial wallet
    const walletAddr = await createCustodialWallet(user.id);

    // credit signup 0.5 MVZX
    await creditTokensToUser(user.id, 0.5);

    // create initial matrix record
    await pool.query("INSERT INTO matrix (user_id, stage, position, earnings, pending_payout) VALUES ($1,1,0,0,0)", [user.id]);

    // jwt
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "30d" });

    return res.json({ success: true, userId: user.id, walletAddress: walletAddr, token });
  } catch (err) {
    console.error("signup err", err);
    return res.status(500).json({ error: "signup failed" });
  }
});

// login
app.post("/api/login", async (req, res) => {
  try {
    const { phone, pin } = req.body;
    if (!phone || !pin) return res.status(400).json({ error: "phone + pin required" });
    const u = await pool.query("SELECT * FROM users WHERE phone=$1", [phone]);
    const user = u.rows[0];
    if (!user) return res.status(401).json({ error: "invalid" });
    const ok = await bcrypt.compare(String(pin) + (PIN_SALT || ""), user.pin_hash);
    if (!ok) return res.status(401).json({ error: "invalid" });
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "30d" });
    return res.json({ success: true, token, userId: user.id });
  } catch (e) {
    console.error("login err", e);
    return res.status(500).json({ error: "login failed" });
  }
});

// purchase init for Flutterwave (client will call this to create a purchase record and payment metadata)
app.post("/api/purchase/flutterwave/init", authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { amountNGN, referrerId } = req.body;
    if (!amountNGN || Number(amountNGN) <= 0) return res.status(400).json({ error: "invalid amount" });

    // create purchase record PENDING
    const p = await pool.query("INSERT INTO purchases (user_id, amount_ngn, status, payment_method, referrer_id) VALUES ($1,$2,'PENDING','FLUTTERWAVE',$3) RETURNING *", [userId, amountNGN, referrerId || null]);
    const purchase = p.rows[0];

    // create Flutterwave payment link (requires Flutterwave secret key)
    // We'll use standard Flutterwave v3 initialize endpoint for a hosted link.
    // In production verify webhook signatures.
    if (!FLW_SECRET_KEY || !FLW_PUBLIC_KEY) {
      // return purchase id; frontend can call bank transfer or admin manual
      return res.json({ success: true, purchaseId: purchase.id, note: "FLW keys not configured on backend" });
    }

    const initUrl = "https://api.flutterwave.com/v3/payments";
    const payload = {
      tx_ref: `mvzx_${purchase.id}_${Date.now()}`,
      amount: String(amountNGN),
      currency: "NGN",
      redirect_url: FRONTEND_URL || "https://maviz-kefi.onrender.com",
      customer: {
        email: `user${userId}@mvzx.local`,
        phonenumber: "0000000000",
        name: `mvzx_user_${userId}`
      },
      customizations: { title: "MVZX Token Purchase" },
      meta: { purchaseId: purchase.id, userId }
    };
    const resp = await axios.post(initUrl, payload, { headers: { Authorization: `Bearer ${FLW_SECRET_KEY}` } });
    const checkoutUrl = resp.data?.data?.link;
    return res.json({ success: true, purchaseId: purchase.id, checkoutUrl });
  } catch (err) {
    console.error("flutterwave init err", err.response?.data || err.message || err);
    return res.status(500).json({ error: "failed to init payment" });
  }
});

// Flutterwave webhook - configure in FLW dashboard to POST here
app.post("/api/purchase/flutterwave/webhook", async (req, res) => {
  try {
    // In production, verify signature using FLW_SECRET_KEY and FLW_ENCRYPTION_KEY
    const body = req.body;
    // Example: event data where meta.purchaseId exists
    const event = body?.data;
    const meta = event?.meta || {};
    const purchaseId = meta?.purchaseId || null;
    const status = event?.status || (body?.data?.status);
    // If successful, mark purchase APPROVED and credit tokens
    if (!purchaseId) {
      console.warn("webhook missing purchaseId", body);
      return res.status(400).json({ error: "no purchase id in webhook" });
    }
    if (status === "successful" || event?.status === "successful") {
      // fetch purchase
      const p = await pool.query("SELECT * FROM purchases WHERE id=$1", [purchaseId]);
      if (!p.rows[0]) return res.status(404).json({ error: "purchase not found" });
      const purchase = p.rows[0];
      if (purchase.status === "APPROVED") return res.json({ success: true, message: "already approved" });

      await pool.query("UPDATE purchases SET status='APPROVED' WHERE id=$1", [purchaseId]);

      // compute tokens
      const usdtEquivalent = Number(purchase.amount_ngn) / Number(NGN_PER_USDT || 1500);
      const tokens = Number((usdtEquivalent / Number(MVZX_USDT_RATE || 0.15)).toFixed(8));

      // credit to wallet
      if (purchase.user_id) {
        await creditTokensToUser(purchase.user_id, tokens);
        // slots eligibility
        const slotCost = Number(SLOT_COST_NGN || 2000);
        const eligible = Math.floor(Number(purchase.amount_ngn) / slotCost);
        if (eligible >= 1) {
          for (let i = 0; i < eligible; i++) {
            await assignPositionAndDistribute(purchase.user_id, slotCost);
          }
        } else {
          // small transaction -> give 2.5% to buyer and 2.5% to referrer if present
          const bonus = tokens * 0.025;
          await pool.query("UPDATE wallets SET token_balance = token_balance + $1 WHERE user_id=$2", [bonus, purchase.user_id]);
          if (purchase.referrer_id) {
            await pool.query("UPDATE wallets SET token_balance = token_balance + $1 WHERE user_id=$2", [bonus, purchase.referrer_id]);
          }
        }
      }
      return res.json({ success: true });
    }
    return res.json({ success: true, message: "ignored" });
  } catch (e) {
    console.error("flutterwave webhook error", e);
    return res.status(500).json({ error: "webhook processing failed" });
  }
});

// manual bank deposit: user uploads evidence in frontend and admin approves via admin endpoint
app.post("/api/purchase/manual", authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { amountNGN, referrerId } = req.body;
    const p = await pool.query("INSERT INTO purchases (user_id, amount_ngn, status, payment_method, referrer_id) VALUES ($1,$2,'PENDING','MANUAL',$3) RETURNING *", [userId, amountNGN, referrerId || null]);
    return res.json({ success: true, purchaseId: p.rows[0].id });
  } catch (e) {
    console.error("manual purchase err", e);
    return res.status(500).json({ error: "failed" });
  }
});

// admin approve manual deposit
app.post("/api/admin/manual/approve/:purchaseId", async (req, res) => {
  try {
    const purchaseId = Number(req.params.purchaseId);
    const p = await pool.query("SELECT * FROM purchases WHERE id=$1", [purchaseId]);
    if (!p.rows[0]) return res.status(404).json({ error: "purchase not found" });
    const purchase = p.rows[0];
    if (purchase.status === "APPROVED") return res.json({ success: true, message: "already approved" });
    await pool.query("UPDATE purchases SET status='APPROVED' WHERE id=$1", [purchaseId]);

    if (purchase.user_id) {
      const usdtEquivalent = Number(purchase.amount_ngn) / Number(NGN_PER_USDT || 1500);
      const tokens = Number((usdtEquivalent / Number(MVZX_USDT_RATE || 0.15)).toFixed(8));
      await creditTokensToUser(purchase.user_id, tokens);

      const slotCost = Number(SLOT_COST_NGN || 2000);
      const eligible = Math.floor(Number(purchase.amount_ngn) / slotCost);
      if (eligible >= 1) {
        for (let i = 0; i < eligible; i++) {
          await assignPositionAndDistribute(purchase.user_id, slotCost);
        }
      } else {
        const bonus = tokens * 0.025;
        await pool.query("UPDATE wallets SET token_balance = token_balance + $1 WHERE user_id=$2", [bonus, purchase.user_id]);
        if (purchase.referrer_id) {
          await pool.query("UPDATE wallets SET token_balance = token_balance + $1 WHERE user_id=$2", [bonus, purchase.referrer_id]);
        }
      }
    }

    return res.json({ success: true });
  } catch (e) {
    console.error("admin manual approve err", e);
    return res.status(500).json({ error: "failed" });
  }
});

// get wallet info
app.get("/api/wallet", authMiddleware, async (req, res) => {
  const userId = req.userId;
  const w = await pool.query("SELECT * FROM wallets WHERE user_id=$1", [userId]);
  const wallet = w.rows[0] || null;
  return res.json({ success: true, wallet });
});

// get matrix for user
app.get("/api/matrix", authMiddleware, async (req, res) => {
  const userId = req.userId;
  const m = await pool.query("SELECT * FROM matrix WHERE user_id=$1 ORDER BY stage", [userId]);
  return res.json({ success: true, matrix: m.rows });
});

// stake tokens: deduct from token_balance and create stake record (maturity: 150 days)
app.post("/api/stake", authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { amount } = req.body;
    if (!amount || Number(amount) <= 0) return res.status(400).json({ error: "invalid amount" });
    // check token balance
    const w = await pool.query("SELECT token_balance FROM wallets WHERE user_id=$1", [userId]);
    const bal = Number(w.rows[0]?.token_balance || 0);
    if (bal < amount) return res.status(400).json({ error: "insufficient tokens" });

    // deduct
    await pool.query("UPDATE wallets SET token_balance = token_balance - $1 WHERE user_id=$2", [amount, userId]);
    const start = new Date();
    const maturity = new Date(Date.now() + 150 * 24 * 60 * 60 * 1000);
    await pool.query("INSERT INTO stakes (user_id, amount, start_at, maturity_at, claimed) VALUES ($1,$2,$3,$4,false)", [userId, amount, start, maturity]);
    return res.json({ success: true, start, maturity });
  } catch (e) {
    console.error("stake err", e);
    return res.status(500).json({ error: "failed" });
  }
});

// claim matured stake
app.post("/api/stake/claim", authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const s = await pool.query("SELECT * FROM stakes WHERE user_id=$1 AND claimed=false AND maturity_at <= now()", [userId]);
    if (s.rows.length === 0) return res.status(400).json({ error: "no matured stakes" });
    let totalReward = 0;
    for (const row of s.rows) {
      // you asked staking 100% in 150 days => reward = amount (100%) so return principal + reward? Clarify: I'll credit the original amount + reward = amount*2
      const reward = Number(row.amount); // 100% reward
      const totalCredit = Number(row.amount) + reward;
      // credit tokens
      await pool.query("UPDATE wallets SET token_balance = token_balance + $1 WHERE user_id=$2", [totalCredit, userId]);
      totalReward += totalCredit;
      await pool.query("UPDATE stakes SET claimed=true WHERE id=$1", [row.id]);
    }
    return res.json({ success: true, totalCredited: totalReward });
  } catch (e) {
    console.error("claim err", e);
    return res.status(500).json({ error: "failed" });
  }
});

// create withdrawal request
app.post("/api/withdraw", authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { amount, method, details } = req.body;
    if (!amount || Number(amount) <= 0) return res.status(400).json({ error: "invalid amount" });
    // check token balance for token->USDT or bank
    const w = await pool.query("SELECT token_balance FROM wallets WHERE user_id=$1", [userId]);
    const bal = Number(w.rows[0]?.token_balance || 0);
    if (bal < amount) return res.status(400).json({ error: "insufficient tokens" });
    // deduct tokens immediately (they are now pending withdrawal)
    await pool.query("UPDATE wallets SET token_balance = token_balance - $1 WHERE user_id=$2", [amount, userId]);
    await pool.query("INSERT INTO withdrawals (user_id, amount, method, details, status) VALUES ($1,$2,$3,$4,'PENDING')", [userId, amount, method, details || null]);
    return res.json({ success: true });
  } catch (e) {
    console.error("withdraw err", e);
    return res.status(500).json({ error: "failed" });
  }
});

// admin list pending withdrawals
app.get("/api/admin/withdrawals", async (req, res) => {
  const r = await pool.query("SELECT w.*, u.phone FROM withdrawals w LEFT JOIN users u ON u.id = w.user_id WHERE w.status='PENDING' ORDER BY w.created_at DESC");
  return res.json({ success: true, rows: r.rows });
});

// admin execute withdrawal (bank/manual or USDT)
app.post("/api/admin/withdrawals/execute/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const r = await pool.query("SELECT * FROM withdrawals WHERE id=$1", [id]);
    if (!r.rows[0]) return res.status(404).json({ error: "not found" });
    const row = r.rows[0];
    if (row.method.toUpperCase() === "USDT") {
      // if LIVE send tokens on-chain as USDT or send equivalent — complex; for now if LIVE true, attempt to send MVZX tokens as tokens to user's details (expected address)
      if (LIVE === "true") {
        try {
          const tx = await sendMVZXOnChain(row.details, Number(row.amount));
          await pool.query("UPDATE withdrawals SET status='COMPLETED' WHERE id=$1", [id]);
          await pool.query("UPDATE withdrawals SET details = $1 WHERE id=$2", [String(tx), id]);
          return res.json({ success: true, tx });
        } catch (e) {
          console.error("onchain send failed", e);
          // revert token balance back? to be done by admin manually; here we'll set status to FAILED and credit back
          await pool.query("UPDATE wallets SET token_balance = token_balance + $1 WHERE user_id=$2", [row.amount, row.user_id]);
          await pool.query("UPDATE withdrawals SET status='FAILED' WHERE id=$1", [id]);
          return res.status(500).json({ error: "onchain send failed" });
        }
      } else {
        // LIVE=false -> mark READY_FOR_MANUAL and admin should use exchange to send USDT off-chain
        await pool.query("UPDATE withdrawals SET status='READY_FOR_MANUAL' WHERE id=$1", [id]);
        return res.json({ success: true, message: "marked ready for manual USDT payout" });
      }
    } else {
      // BANK: mark ready for manual payout, admin will pay to COMPANY_BANK_* from company account
      await pool.query("UPDATE withdrawals SET status='READY_FOR_BANK' WHERE id=$1", [id]);
      return res.json({ success: true, message: "marked ready for bank payout" });
    }
  } catch (e) {
    console.error("admin execute withdraw err", e);
    return res.status(500).json({ error: "failed" });
  }
});

// admin see matrix entries with pending payout
app.get("/api/admin/matrix/pending", async (req, res) => {
  const r = await pool.query("SELECT m.*, w.address as wallet_address FROM matrix m LEFT JOIN wallets w ON w.user_id = m.user_id WHERE pending_payout::numeric > 0 ORDER BY m.created_at DESC");
  return res.json({ success: true, rows: r.rows });
});

// admin payout matrix pending lumpsum (credits token balance)
app.post("/api/admin/matrix/payout/:matrixId", async (req, res) => {
  try {
    const matrixId = Number(req.params.matrixId);
    const out = await adminPayoutMatrix(matrixId);
    return res.json(out);
  } catch (e) {
    console.error("admin payout err", e);
    return res.status(500).json({ error: "failed" });
  }
});

// get purchases for user
app.get("/api/purchases", authMiddleware, async (req, res) => {
  const userId = req.userId;
  const r = await pool.query("SELECT * FROM purchases WHERE user_id=$1 ORDER BY created_at DESC", [userId]);
  return res.json({ success: true, purchases: r.rows });
});

// get withdrawals for user
app.get("/api/withdrawals", authMiddleware, async (req, res) => {
  const userId = req.userId;
  const r = await pool.query("SELECT * FROM withdrawals WHERE user_id=$1 ORDER BY created_at DESC", [userId]);
  return res.json({ success: true, withdrawals: r.rows });
});

// ---- Startup actions ----
(async () => {
  try {
    await ensureTables();
    // start USDT watcher
    await startUSDTWatcher();
    app.listen(PORT, () => console.log(`MVZX backend listening on ${PORT}`));
  } catch (e) {
    console.error("startup err", e);
    process.exit(1);
  }
})();
