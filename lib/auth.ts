import { createHmac, timingSafeEqual } from "crypto";
import type { CapabilityRecord } from "./types";

export function allowedKeyIds(): string[] {
  return (process.env.ALLOWED_WALLET_KEY_IDS || "mvp-wallet-ai-2026")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function secret(): string {
  const s = process.env.WALLET_AI_HMAC_SECRET;
  if (!s) throw new Error("WALLET_AI_HMAC_SECRET is not set");
  return s;
}

export function canonicalPublishPayload(record: Omit<CapabilityRecord, "signature" | "status"> & { status?: string }): string {
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

export function signPublish(record: Omit<CapabilityRecord, "signature" | "status">): string {
  return createHmac("sha256", secret()).update(canonicalPublishPayload(record)).digest("hex");
}

export function verifyPublishSignature(record: CapabilityRecord): boolean {
  if (!record.signature || !record.key_id) return false;
  if (!allowedKeyIds().includes(record.key_id)) return false;
  const expected = signPublish(record);
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(record.signature, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function canonicalRevokePayload(record_id: string, key_id: string): string {
  return JSON.stringify({ action: "revoke", record_id, key_id });
}

export function signRevoke(record_id: string, key_id: string): string {
  return createHmac("sha256", secret()).update(canonicalRevokePayload(record_id, key_id)).digest("hex");
}

export function verifyRevokeSignature(record_id: string, key_id: string, signature: string): boolean {
  if (!signature || !key_id) return false;
  if (!allowedKeyIds().includes(key_id)) return false;
  const expected = signRevoke(record_id, key_id);
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(signature, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
