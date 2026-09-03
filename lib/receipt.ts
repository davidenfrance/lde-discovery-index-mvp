import { createHash, randomBytes } from "crypto";
import {
  canonicalPublishPayload,
  normalizeHex,
  signWithPem,
} from "./auth";
import type { CapabilityRecord } from "./types";

export const RECEIPT_ACTION = "ldedi-query-receipt-1.0";
export const ENVELOPE_ACTION = "ldedi-query-envelope-1.0";
export const RECEIPT_TTL_MS = 120_000;

export type DeclaredQuery = {
  task: string | null;
  jurisdiction: string | null;
  firm: string | null;
  verification: string | null;
  language: string | null;
};

export type QueryReceiptBody = {
  action: typeof RECEIPT_ACTION;
  receipt_id: string;
  query_id: string;
  index_id: string;
  record_id: string;
  key_id: string;
  session_url: string | null;
  record_canonical_hash: string;
  served_row_hash: string;
  listing_signature: string;
  query: DeclaredQuery;
  interrogator_key_id: string;
  queried_at: string;
  receipt_expires_at: string;
};

export type QueryReceipt = QueryReceiptBody & {
  signature: string;
  index_public_key_hex: string;
};

export type QueryEnvelopeBody = {
  action: typeof ENVELOPE_ACTION;
  query_id: string;
  index_id: string;
  interrogator_key_id: string;
  query: DeclaredQuery;
  count: number;
  receipt_ids: string[];
  queried_at: string;
  receipt_expires_at: string;
};

export type QueryEnvelope = QueryEnvelopeBody & {
  signature: string;
  index_public_key_hex: string;
};

function sha256Hex(message: string): string {
  return "sha256:" + createHash("sha256").update(message, "utf8").digest("hex");
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    const src = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(src).sort()) out[key] = stable(src[key]);
    return out;
  }
  return value;
}

function newId(prefix: string): string {
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `${prefix}-${day}-${randomBytes(4).toString("hex")}`;
}

export function parseInterrogatorKey(raw: string | null): string | null {
  if (!raw) return null;
  const hex = normalizeHex(raw);
  if (!/^[0-9a-f]{64}$/.test(hex)) return null;
  return hex;
}

export function declaredQuery(params: {
  task?: string | null;
  jurisdiction?: string | null;
  firm?: string | null;
  verification?: string | null;
  language?: string | null;
}): DeclaredQuery {
  return {
    task: params.task || null,
    jurisdiction: params.jurisdiction || null,
    firm: params.firm || null,
    verification: params.verification || null,
    language: params.language || null,
  };
}

export function servedRowCanonical(record: CapabilityRecord): string {
  return JSON.stringify({
    record_id: record.record_id,
    agent_id: record.agent_id,
    principal_id: record.principal_id,
    display_name: record.display_name ?? null,
    tasks: [...record.tasks].sort(),
    jurisdiction: record.jurisdiction,
    settlement_currency: record.settlement_currency,
    value_band_usd_min: record.value_band_usd_min,
    value_band_usd_max: record.value_band_usd_max,
    endpoints: stable(record.endpoints || {}),
    evidence: stable(record.evidence || {}),
    issued_at: record.issued_at,
    expires_at: record.expires_at,
    status: record.status,
    key_id: normalizeHex(record.key_id),
    signature: normalizeHex(record.signature),
  });
}

export function canonicalQueryReceipt(body: QueryReceiptBody): string {
  return JSON.stringify({
    action: body.action,
    receipt_id: body.receipt_id,
    query_id: body.query_id,
    index_id: body.index_id,
    record_id: body.record_id,
    key_id: normalizeHex(body.key_id),
    session_url: body.session_url,
    record_canonical_hash: body.record_canonical_hash,
    served_row_hash: body.served_row_hash,
    listing_signature: normalizeHex(body.listing_signature),
    query: {
      task: body.query.task,
      jurisdiction: body.query.jurisdiction,
      firm: body.query.firm,
      verification: body.query.verification,
      language: body.query.language,
    },
    interrogator_key_id: normalizeHex(body.interrogator_key_id),
    queried_at: body.queried_at,
    receipt_expires_at: body.receipt_expires_at,
  });
}

export function canonicalQueryEnvelope(body: QueryEnvelopeBody): string {
  return JSON.stringify({
    action: body.action,
    query_id: body.query_id,
    index_id: body.index_id,
    interrogator_key_id: normalizeHex(body.interrogator_key_id),
    query: {
      task: body.query.task,
      jurisdiction: body.query.jurisdiction,
      firm: body.query.firm,
      verification: body.query.verification,
      language: body.query.language,
    },
    count: body.count,
    receipt_ids: [...body.receipt_ids].sort(),
    queried_at: body.queried_at,
    receipt_expires_at: body.receipt_expires_at,
  });
}

export function issueQueryReceipts(
  records: CapabilityRecord[],
  query: DeclaredQuery,
  interrogatorKeyId: string
): { envelope: QueryEnvelope; records: Array<CapabilityRecord & { receipt: QueryReceipt }> } {
  const pem = process.env.INDEX_PRIVATE_KEY_PEM;
  const pub = process.env.INDEX_PUBLIC_KEY_HEX;
  if (!pem || !pub) {
    throw new Error("INDEX_PRIVATE_KEY_PEM_or_INDEX_PUBLIC_KEY_HEX_missing");
  }
  const indexId = process.env.INDEX_ID || "lde-discovery-index-mvp";
  const queriedAt = new Date();
  const expires = new Date(queriedAt.getTime() + RECEIPT_TTL_MS);
  const queried_at = queriedAt.toISOString();
  const receipt_expires_at = expires.toISOString();
  const query_id = newId("q");
  const pubHex = normalizeHex(pub);

  const withReceipts = records.map((record) => {
    const body: QueryReceiptBody = {
      action: RECEIPT_ACTION,
      receipt_id: newId("qr"),
      query_id,
      index_id: indexId,
      record_id: record.record_id,
      key_id: normalizeHex(record.key_id),
      session_url: record.endpoints?.session || null,
      record_canonical_hash: sha256Hex(canonicalPublishPayload(record)),
      served_row_hash: sha256Hex(servedRowCanonical(record)),
      listing_signature: normalizeHex(record.signature),
      query,
      interrogator_key_id: interrogatorKeyId,
      queried_at,
      receipt_expires_at,
    };
    const receipt: QueryReceipt = {
      ...body,
      signature: signWithPem(canonicalQueryReceipt(body), pem),
      index_public_key_hex: pubHex,
    };
    return { ...record, receipt };
  });

  const envelopeBody: QueryEnvelopeBody = {
    action: ENVELOPE_ACTION,
    query_id,
    index_id: indexId,
    interrogator_key_id: interrogatorKeyId,
    query,
    count: withReceipts.length,
    receipt_ids: withReceipts.map((r) => r.receipt.receipt_id),
    queried_at,
    receipt_expires_at,
  };
  const envelope: QueryEnvelope = {
    ...envelopeBody,
    signature: signWithPem(canonicalQueryEnvelope(envelopeBody), pem),
    index_public_key_hex: pubHex,
  };
  return { envelope, records: withReceipts };
}
