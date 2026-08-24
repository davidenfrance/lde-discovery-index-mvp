# LDE Discovery Index MVP

Public Vercel service for capability records and revocation only.

## Burned into the wallet (not on this host)
- Locator
- Index public key (with the locator) - Wallet AI verifies index is not fake
- Wallet ID public key - is the Wallet ID; bound on each capability record

## On this host
- Capability records in Postgres
- Verify record signature against Wallet ID public key on the record (key_id)
- Revoke hides record from later GET
- No wallet allow-list

## Endpoints
- GET /api/v1/health
- GET /api/v1/index-identity
- GET /api/v1/records
- POST /api/v1/records
- POST /api/v1/records/{id}/revoke

## Env
- DATABASE_URL
- INDEX_PRIVATE_KEY_PEM
- INDEX_PUBLIC_KEY_HEX (optional hint; wallets use burned copy)
- INDEX_ID
