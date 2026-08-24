/**
 * Generate an Ed25519 wallet keypair and sign a sample capability record.
 * Private key stays local. Put the public address in ALLOWED_WALLET_ADDRESSES on Vercel.
 */
import { generateKeyPairSync, sign } from "crypto";
import { writeFileSync } from "fs";

const { publicKey, privateKey } = generateKeyPairSync("ed25519");
const jwk = publicKey.export({ format: "jwk" });
const address = Buffer.from(jwk.x, "base64url").toString("hex");
const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();

writeFileSync("wallet-private.pem", pem);
console.log("Public address (set on Vercel ALLOWED_WALLET_ADDRESSES):\n" + address);
console.log("\nPrivate key written to wallet-private.pem (keep on the wallet only)\n");

const key_id = address;
const recordCore = {
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

const publishMessage = JSON.stringify(recordCore);
const signature = sign(null, Buffer.from(publishMessage, "utf8"), privateKey).toString("hex");

const body = {
  ...recordCore,
  display_name: "LDE wallet-to-wallet escrow settle",
  endpoints: { settle: "bundle://escrow/settle" },
  evidence: { mandate_required: true },
  signature,
};

console.log("POST /api/v1/records body:\n" + JSON.stringify(body, null, 2));

const revokeMessage = JSON.stringify({ action: "revoke", record_id: recordCore.record_id, key_id });
const revokeSig = sign(null, Buffer.from(revokeMessage, "utf8"), privateKey).toString("hex");
console.log("\nPOST /api/v1/records/rec-demo-001/revoke body:");
console.log(JSON.stringify({ key_id, signature: revokeSig }, null, 2));
