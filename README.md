# MVZx Backend (Simulation + Engine)

This service contains a simulation engine that implements the Stage-1 feeder logic, referral push rules,
Stage 2..N autopay logic, pegged MC for Stage 8-10, per-6-leg tranche payouts, and admin initial accounts.
1. Add environment variables in Render (use ones you gave exactly). Ensure LIVE=true for production.
2. Run prisma migrate deploy (or push) on Render deploy hook.
3. Ensure ADMIN_PRIVATE_KEY is secure.
4. Build and start server.
## Quick start (local dev)

1. Paste the files into your GitHub repo `mvzx-backend`.
2. On your Android/GitHub, commit/push.
3. On Render: create web service pointing to the repo.
4. Ensure env:
   - PORT (optional)
5. Deploy.

## Simulation endpoint

POST `/simulate` (JSON body optional):
```json
{
  "options": {
    "stages": 10,
    "principalSlotPrice": 2000,
    "referralPushCount": 32,
    "preferReferralToSetNextStagePrice": true
  }
}
