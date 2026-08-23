import { neon } from "@neondatabase/serverless";
import type { CapabilityRecord, QueryFilters } from "./types";

function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return neon(url);
}

export async function ensureSchema(): Promise<void> {
  const db = sql();
  await db`
    CREATE TABLE IF NOT EXISTS capability_records (
      record_id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      principal_id TEXT NOT NULL,
      display_name TEXT,
      tasks TEXT[] NOT NULL,
      jurisdiction TEXT NOT NULL,
      settlement_currency TEXT NOT NULL,
      value_band_usd_min INTEGER NOT NULL,
      value_band_usd_max INTEGER NOT NULL,
      endpoints JSONB NOT NULL DEFAULT '{}'::jsonb,
      evidence JSONB,
      issued_at TIMESTAMPTZ NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      key_id TEXT NOT NULL,
      signature TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
}

function rowToRecord(row: Record<string, unknown>): CapabilityRecord {
  return {
    record_id: String(row.record_id),
    agent_id: String(row.agent_id),
    principal_id: String(row.principal_id),
    display_name: row.display_name ? String(row.display_name) : undefined,
    tasks: row.tasks as string[],
    jurisdiction: String(row.jurisdiction),
    settlement_currency: String(row.settlement_currency),
    value_band_usd_min: Number(row.value_band_usd_min),
    value_band_usd_max: Number(row.value_band_usd_max),
    endpoints: (row.endpoints as Record<string, string>) || {},
    evidence: (row.evidence as Record<string, unknown>) || undefined,
    issued_at: new Date(String(row.issued_at)).toISOString(),
    expires_at: new Date(String(row.expires_at)).toISOString(),
    status: row.status as CapabilityRecord["status"],
    key_id: String(row.key_id),
    signature: String(row.signature),
  };
}

export async function listLiveRecords(filters: QueryFilters): Promise<CapabilityRecord[]> {
  const db = sql();
  const now = new Date().toISOString();
  const rows = await db`
    SELECT * FROM capability_records
    WHERE status = 'active'
      AND expires_at > ${now}::timestamptz
      AND (${filters.task ?? null}::text IS NULL OR ${filters.task ?? null} = ANY(tasks))
      AND (${filters.jurisdiction ?? null}::text IS NULL OR jurisdiction = ${filters.jurisdiction ?? null})
      AND (${filters.currency ?? null}::text IS NULL OR settlement_currency = ${filters.currency ?? null})
      AND (${filters.max_usd ?? null}::int IS NULL OR (
        value_band_usd_min <= ${filters.max_usd ?? 0}
        AND value_band_usd_max >= ${filters.max_usd ?? 0}
      ))
    ORDER BY record_id
  `;
  return (rows as Record<string, unknown>[]).map(rowToRecord);
}

export async function upsertRecord(record: CapabilityRecord): Promise<CapabilityRecord> {
  const db = sql();
  const rows = await db`
    INSERT INTO capability_records (
      record_id, agent_id, principal_id, display_name, tasks, jurisdiction,
      settlement_currency, value_band_usd_min, value_band_usd_max, endpoints,
      evidence, issued_at, expires_at, status, key_id, signature, updated_at
    ) VALUES (
      ${record.record_id}, ${record.agent_id}, ${record.principal_id}, ${record.display_name ?? null},
      ${record.tasks}, ${record.jurisdiction}, ${record.settlement_currency},
      ${record.value_band_usd_min}, ${record.value_band_usd_max},
      ${JSON.stringify(record.endpoints)}::jsonb,
      ${JSON.stringify(record.evidence ?? {})}::jsonb,
      ${record.issued_at}::timestamptz, ${record.expires_at}::timestamptz,
      ${record.status}, ${record.key_id}, ${record.signature}, now()
    )
    ON CONFLICT (record_id) DO UPDATE SET
      agent_id = EXCLUDED.agent_id,
      principal_id = EXCLUDED.principal_id,
      display_name = EXCLUDED.display_name,
      tasks = EXCLUDED.tasks,
      jurisdiction = EXCLUDED.jurisdiction,
      settlement_currency = EXCLUDED.settlement_currency,
      value_band_usd_min = EXCLUDED.value_band_usd_min,
      value_band_usd_max = EXCLUDED.value_band_usd_max,
      endpoints = EXCLUDED.endpoints,
      evidence = EXCLUDED.evidence,
      issued_at = EXCLUDED.issued_at,
      expires_at = EXCLUDED.expires_at,
      status = EXCLUDED.status,
      key_id = EXCLUDED.key_id,
      signature = EXCLUDED.signature,
      updated_at = now()
    RETURNING *
  `;
  return rowToRecord(rows[0] as Record<string, unknown>);
}

export async function revokeRecord(record_id: string): Promise<boolean> {
  const db = sql();
  const rows = await db`
    UPDATE capability_records
    SET status = 'revoked', updated_at = now()
    WHERE record_id = ${record_id}
    RETURNING record_id
  `;
  return rows.length > 0;
}
