import {
  createPublicKey,
  createPrivateKey,
  verify,
  generateKeyPairSync,
  sign,
} from "crypto";
import type { CapabilityRecord } from "./types";

/**
 * Confirmed model:
 * - No server allow-list of wallets.
 * - Wallet ID = Ed25519 public key burned into the wallet; bound on each capability record as key_id.
 * - Locator + a separate index public key are burned into the wallet so the Wallet AI can verify the Discovery Index is not fake.
 * - Private keys never leave the wallet (or the index operator's secure store for the index key).
 */

export function normalizeHex(value: string): string {
  return value.trim().toLowerCase().replace(/^0x/, "");
}

function publicKeyFromHex(pubHex: string) {
  const raw = Buffer.from(normalizeHex(pubHex), "hex");
  if (raw.length !== 32) {
    throw new Error("public_key_must_be_32_byte_ed25519_hex");
  }
  return createPublicKey({
    key: {
      kty: "OKP",
      crv: "Ed25519",
      x: raw.toString("base64url"),
    },
    format: "jwk",
  });
}

function verifyEd25519(message: string, publicKeyHex: string, signatureHex: string): boolean {
  try {
    const key = publicKeyFromHex(publicKeyHex);
    const sig = Buffer.from(normalizeHex(signatureHex), "hex");
    return verify(null, Buffer.from(message, "utf8"), key, sig);
  } catch {
    return false;
  }
}

export function canonicalPublishPayload(
  record: Omit<CapabilityRecord, "signature" | "status"> & { status?: string }
): string {
  const body = {
    record_id: record.record_id,
    agent_id: record.agent_id,
    principal_id: record.principal_id,
    tasks: [...record.tasks].sort(),
    jurisdiction: record.jurisdiction,
    settlement_currency: record.settlement_currency,
    value_band_usd_min: record.value_band_usd_min,
    value_band_usd_max: record.value_band_usd_max,
    issued_at: record.issued_at,
    expires_at: record.expires_at,
    key_id: normalizeHex(record.key_id),
  };
  return JSON.stringify(body);
}

export function canonicalRevokePayload(record_id: string, key_id: string): string {
  return JSON.stringify({
    action: "revoke",
    record_id,
    key_id: normalizeHex(key_id),
  });
}

export function verifyPublishSignature(record: CapabilityRecord): boolean {
  if (!record.signature || !record.key_id) return false;
  const keyId = normalizeHex(record.key_id);
  if (keyId.length !== 64) return false;
  return verifyEd25519(canonicalPublishPayload(record), keyId, record.signature);
}

export function verifyRevokeSignature(
  record_id: string,
  key_id: string,
  signature: string
): boolean {
  if (!signature || !key_id) return false;
  const keyId = normalizeHex(key_id);
  if (keyId.length !== 64) return false;
  return verifyEd25519(canonicalRevokePayload(record_id, keyId), keyId, signature);
}

export function canonicalIndexIdentity(payload: {
  index_id: string;
  service: string;
  issued_at: string;
}): string {
  return JSON.stringify({
    index_id: payload.index_id,
    service: payload.service,
    issued_at: payload.issued_at,
  });
}

export function signIndexIdentity(payload: {
  index_id: string;
  service: string;
  issued_at: string;
}): { statement: string; signature: string; public_key_hint?: string } {
  const pem = process.env.INDEX_PRIVATE_KEY_PEM;
  if (!pem) {
    throw new Error("INDEX_PRIVATE_KEY_PEM is not set");
  }
  const statement = canonicalIndexIdentity(payload);
  const key = createPrivateKey(pem);
  const signature = sign(null, Buffer.from(statement, "utf8"), key).toString("hex");
  return {
    statement,
    signature,
    public_key_hint: process.env.INDEX_PUBLIC_KEY_HEX || undefined,
  };
}

export function verifyIndexIdentity(
  statementJson: string,
  signatureHex: string,
  burnedIndexPublicKeyHex: string
): boolean {
  return verifyEd25519(statementJson, burnedIndexPublicKeyHex, signatureHex);
}

export function generateWalletKeypair(): { address: string; privateKeyPkcs8Pem: string } {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const jwk = publicKey.export({ format: "jwk" }) as { x?: string };
  const address = Buffer.from(jwk.x || "", "base64url").toString("hex");
  return {
    address,
    privateKeyPkcs8Pem: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
  };
}

export function signWithPem(message: string, privateKeyPem: string): string {
  const key = createPrivateKey(privateKeyPem);
  return sign(null, Buffer.from(message, "utf8"), key).toString("hex");
}
