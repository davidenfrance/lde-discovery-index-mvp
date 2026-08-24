const { generateKeyPairSync, createPrivateKey, createPublicKey, sign } = require("crypto");
const { writeFileSync, readFileSync, existsSync } = require("fs");

const pemPath = process.env.WALLET_PEM || "wallet-id-private.pem";

let privateKey;
let key_id;

if (existsSync(pemPath)) {
  privateKey = createPrivateKey(readFileSync(pemPath, "utf8"));
  const jwk = createPublicKey(privateKey).export({ format: "jwk" });
  key_id = Buffer.from(jwk.x, "base64url").toString("hex");
} else {
  const pair = generateKeyPairSync("ed25519");
  privateKey = pair.privateKey;
  writeFileSync(pemPath, pair.privateKey.export({ type: "pkcs8", format: "pem" }).toString());
  const jwk = pair.publicKey.export({ format: "jwk" });
  key_id = Buffer.from(jwk.x, "base64url").toString("hex");
}

const canonical = {
  record_id: process.env.RECORD_ID || "rec-sim-001",
  agent_id: "agent-escrow-lde-01",
  principal_id: "prin-lde-settle-01",
  tasks: ["escrow_settle"],
  jurisdiction: "England and Wales",
  settlement_currency: "GENIUS_USD",
  value_band_usd_min: 1000,
  value_band_usd_max: 250000,
  issued_at: "2026-08-24T16:00:00.000Z",
  expires_at: "2026-11-30T23:59:59.000Z",
  key_id,
};

const signature = sign(null, Buffer.from(JSON.stringify(canonical), "utf8"), privateKey).toString("hex");
const body = { ...canonical, endpoints: { settle: "bundle://escrow/settle" }, signature };
writeFileSync("signed-record.json", JSON.stringify(body, null, 2));
process.stdout.write(JSON.stringify(body, null, 2) + "\n");
