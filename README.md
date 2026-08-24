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

## Auth (public address)
- `key_id` = wallet public address (Ed25519 public key hex)
- `signature` = Ed25519 over the canonical payload
- Private key stays on the wallet
- Vercel env: `ALLOWED_WALLET_ADDRESSES` (comma-separated public addresses)
- No shared HMAC secret

## Deploy env
- `DATABASE_URL`
- `ALLOWED_WALLET_ADDRESSES`

```bash
node scripts/sign-example.mjs
```

## Vest
This service does not settle. Wallet AI bootstraps from pins/locator, filters locally, escalates First Service off this host, checks Mandate, then Vests.
