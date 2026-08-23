import { createHmac } from "crypto";

const secret = process.env.WALLET_AI_HMAC_SECRET || "change-me-mvp-secret";
const key_id = "mvp-wallet-ai-2026";

const record = {
  record_id: "rec-demo-001",
  agent_id: "agent-escrow-lde-01",
  principal_id: "prin-lde-settle-01",
  tasks: ["escrow_settle"].sort(),
  jurisdiction: "England and Wales",
  settlement_currency: "GENIUS_USD",
  value_band_usd_min: 1000,
  value_band_usd_max: 250000,
  issued_at: "2026-08-01T00:00:00.000Z",
  expires_at: "2026-11-30T23:59:59.000Z",
  key_id,
};

record.signature = createHmac("sha256", secret)
  .update(JSON.stringify(record))
  .digest("hex");

console.log(JSON.stringify({ ...record, display_name: "LDE wallet-to-wallet escrow settle", endpoints: { settle: "bundle://escrow/settle" }, evidence: { mandate_required: true } }, null, 2));

const revoke = { action: "revoke", record_id: record.record_id, key_id };
console.log("REVOKE_SIG", createHmac("sha256", secret).update(JSON.stringify(revoke)).digest("hex"));
