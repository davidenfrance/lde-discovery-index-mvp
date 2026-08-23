# LDE Discovery Index MVP

Public Vercel service for **capability records** and **revocation** only.

## Not on this host
- Discovery Index Locator
- Pinned keys (LDE wallet / bootstrap)
- First Service identity

## On this host
- Store capability records in Postgres
- Accept new records from a **signed MVP Wallet AI**
- Revoke a record so later GET queries do not return it

## Endpoints
- `GET /api/v1/health`
- `GET /api/v1/records?task=escrow_settle&max_usd=12000&jurisdiction=England%20and%20Wales&currency=GENIUS_USD`
- `POST /api/v1/records`
- `POST /api/v1/records/{record_id}/revoke`

Revoked rows remain in Postgres for audit. Query results exclude them.

## Deploy
1. Import `davidenfrance/lde-discovery-index-mvp` in Vercel
2. Add env vars from `.env.example`
3. Create Vercel Postgres or Neon and set `DATABASE_URL`
4. Deploy

Schema is created automatically on first request.

## Signed Wallet AI publish
HMAC-SHA256 over the canonical JSON of:
record_id, agent_id, principal_id, tasks (sorted), jurisdiction, settlement_currency, value_band_usd_min, value_band_usd_max, issued_at, expires_at, key_id

Use secret `WALLET_AI_HMAC_SECRET`. `key_id` must be in `ALLOWED_WALLET_KEY_IDS`.

```bash
node scripts/sign-example.mjs
curl -X POST https://YOUR-DEPLOY.vercel.app/api/v1/records \
  -H 'content-type: application/json' \
  -d @signed-record.json
```

Revoke:

```bash
curl -X POST https://YOUR-DEPLOY.vercel.app/api/v1/records/rec-demo-001/revoke \
  -H 'content-type: application/json' \
  -d '{"key_id":"mvp-wallet-ai-2026","signature":"HEX"}'
```

## Vest
This service does not settle. Wallet AI still bootstraps from pins/locator, filters locally, escalates First Service off this host, checks Mandate, then Vests.
