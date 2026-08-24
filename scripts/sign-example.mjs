import { generateKeyPairSync, sign } from "crypto";
import { writeFileSync } from "fs";

const { publicKey, privateKey } = generateKeyPairSync("ed25519");
const jwk = publicKey.export({ format: "jwk" });
const walletIdPublicKey = Buffer.from(jwk.x, "base64url").toString("hex");
const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();

writeFileSync("wallet-id-private.pem", pem);
console.log("Wallet ID public key (burn into wallet; bind on records as key_id):\n" + walletIdPublicKey);

const key_id = walletIdPublicKey;
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

const signature = sign(null, Buffer.from(JSON.stringify(recordCore), "utf8"), privateKey).toString("hex");
console.log(JSON.stringify({ ...recordCore, signature, endpoints: {}, evidence: {} }, null, 2));
