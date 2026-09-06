import { neon } from "@neondatabase/serverless";

function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return neon(url);
}

export async function ensureGateSchema(): Promise<void> {
  const db = sql();
  await db`
    CREATE TABLE IF NOT EXISTS gate_offers (
      offer_id TEXT PRIMARY KEY,
      form_id TEXT NOT NULL,
      form_hash TEXT NOT NULL,
      interrogator_key_id TEXT NOT NULL,
      query_json TEXT NOT NULL,
      fee_amount TEXT NOT NULL,
      fee_currency TEXT NOT NULL,
      fee_account TEXT NOT NULL,
      rail TEXT NOT NULL,
      quote_expires_at TIMESTAMPTZ NOT NULL,
      status TEXT NOT NULL DEFAULT 'offered',
      index_statement TEXT NOT NULL,
      index_signature TEXT NOT NULL,
      accept_statement TEXT,
      accept_signature TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
}

export type GateOffer = {
  offer_id: string;
  form_id: string;
  form_hash: string;
  interrogator_key_id: string;
  query_json: string;
  fee_amount: string;
  fee_currency: string;
  fee_account: string;
  rail: string;
  quote_expires_at: string;
  status: string;
  index_statement: string;
  index_signature: string;
  accept_statement: string | null;
  accept_signature: string | null;
};

function row(r: Record<string, unknown>): GateOffer {
  return {
    offer_id: String(r.offer_id),
    form_id: String(r.form_id),
    form_hash: String(r.form_hash),
    interrogator_key_id: String(r.interrogator_key_id),
    query_json: String(r.query_json),
    fee_amount: String(r.fee_amount),
    fee_currency: String(r.fee_currency),
    fee_account: String(r.fee_account),
    rail: String(r.rail),
    quote_expires_at: new Date(String(r.quote_expires_at)).toISOString(),
    status: String(r.status),
    index_statement: String(r.index_statement),
    index_signature: String(r.index_signature),
    accept_statement: r.accept_statement ? String(r.accept_statement) : null,
    accept_signature: r.accept_signature ? String(r.accept_signature) : null,
  };
}

export async function insertGateOffer(o: GateOffer): Promise<GateOffer> {
  const db = sql();
  const rows = await db`
    INSERT INTO gate_offers (
      offer_id, form_id, form_hash, interrogator_key_id, query_json,
      fee_amount, fee_currency, fee_account, rail, quote_expires_at, status,
      index_statement, index_signature
    ) VALUES (
      ${o.offer_id}, ${o.form_id}, ${o.form_hash}, ${o.interrogator_key_id}, ${o.query_json},
      ${o.fee_amount}, ${o.fee_currency}, ${o.fee_account}, ${o.rail},
      ${o.quote_expires_at}::timestamptz, ${o.status},
      ${o.index_statement}, ${o.index_signature}
    )
    RETURNING *
  `;
  return row(rows[0] as Record<string, unknown>);
}

export async function getGateOffer(offer_id: string): Promise<GateOffer | null> {
  const db = sql();
  const rows = await db`SELECT * FROM gate_offers WHERE offer_id = ${offer_id} LIMIT 1`;
  if (!rows.length) return null;
  return row(rows[0] as Record<string, unknown>);
}

export async function markGateAccepted(
  offer_id: string,
  accept_statement: string,
  accept_signature: string
): Promise<GateOffer | null> {
  const db = sql();
  const rows = await db`
    UPDATE gate_offers
    SET status = 'accepted',
        accept_statement = ${accept_statement},
        accept_signature = ${accept_signature},
        updated_at = now()
    WHERE offer_id = ${offer_id}
    RETURNING *
  `;
  if (!rows.length) return null;
  return row(rows[0] as Record<string, unknown>);
}
