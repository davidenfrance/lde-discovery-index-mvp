import {
  createPublicKey,
  createPrivateKey,
  verify,
  generateKeyPairSync,
  sign,
} from "crypto";
import type { CapabilityRecord } from "./types";

/** Allowed wallet public addresses (Ed25519 public keys as hex). */
export function allowedWalletAddresses(): string[] {
  const primary = process.env.ALLOWED_WALLET_ADDRESSES || "";
  const legacy = process.env.ALLOWED_WALLET_KEY_IDS || "";
  return `${primary},${legacy}`
    .split(",")
    .map((s) => s.trim().toLowerCase().replace(/^0x/, ""))
    .filter(Boolean);
}

export function normalizeAddress(address: string): string {
  return address.trim().toLowerCase().replace(/^0x/, "");
}

function publicKeyFromAddress(addressHex: string) {
  const raw = Buffer.from(normalizeAddress(addressHex), "hex");
  if (raw.length !== 32) {
    throw new Error("wallet_address_must_be_32_byte_ed25519_public_key_hex");
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
    key_id: record.key_id,
  };
  return JSON.stringify(body);
}

export function canonicalRevokePayload(record_id: string, key_id: string): string {
  return JSON.stringify({ action: "revoke", record_id, key_id });
}

function verifyEd25519(message: string, addressHex: string, signatureHex: string): boolean {
  try {
    const address = normalizeAddress(addressHex);
    if (!allowedWalletAddresses().includes(address)) return false;
    const key = publicKeyFromAddress(address);
    const sig = Buffer.from(signatureHex.replace(/^0x/, ""), "hex");
    return verify(null, Buffer.from(message, "utf8"), key, sig);
  } catch {
    return false;
  }
}

/**
 * Publish auth: key_id is the wallet public address (Ed25519 pubkey hex).
 * signature is Ed25519 over the canonical publish payload.
 * Private key never leaves the wallet.
 */
export function verifyPublishSignature(record: CapabilityRecord): boolean {
  if (!record.signature || !record.key_id) return false;
  return verifyEd25519(canonicalPublishPayload(record), record.key_id, record.signature);
}

export function verifyRevokeSignature(
  record_id: string,
  key_id: string,
  signature: string
): boolean {
  if (!signature || !key_id) return false;
  return verifyEd25519(canonicalRevokePayload(record_id, key_id), key_id, signature);
}

/** Local/dev helper only — Wallet AI holds the real private key. */
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
