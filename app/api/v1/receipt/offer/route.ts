import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { normalizeHex } from "@/lib/auth";
import {
  FORM_ID,
  formHash,
  loadFormText,
  feeFromEnv,
  canonicalOffer,
  signIndexMessage,
} from "@/lib/gate-form";
import { ensureGateSchema, insertGateOffer } from "@/lib/gate-offers";
import { declaredQuery } from "@/lib/receipt";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await ensureGateSchema();
    const body = (await req.json()) as {
      interrogator_key_id?: string;
      task?: string;
      jurisdiction?: string;
      firm?: string;
      verification?: string;
      language?: string;
    };
    if (!body.interrogator_key_id) {
      return NextResponse.json({ error: "interrogator_key_id_required" }, { status: 400 });
    }
    const interrogator_key_id = normalizeHex(body.interrogator_key_id);
    if (interrogator_key_id.length !== 64) {
      return NextResponse.json({ error: "interrogator_key_id_must_be_ed25519_hex" }, { status: 400 });
    }
    const fee = feeFromEnv();
    const offer_id = "rec-" + randomUUID();
    const form_hash = formHash();
    const quote_expires_at = new Date(Date.now() + 120 * 1000).toISOString();
    const query = declaredQuery(body);
    const query_json = JSON.stringify(query);
    const statement = canonicalOffer({
      offer_id,
      form_id: FORM_ID,
      form_hash,
      interrogator_key_id,
      query_json,
      fee_amount: fee.fee_amount,
      fee_currency: fee.fee_currency,
      fee_account: fee.fee_account,
      quote_expires_at,
    });
    const index_signature = signIndexMessage(statement);
    await insertGateOffer({
      offer_id,
      form_id: FORM_ID,
      form_hash,
      interrogator_key_id,
      query_json,
      fee_amount: fee.fee_amount,
      fee_currency: fee.fee_currency,
      fee_account: fee.fee_account,
      rail: fee.rail,
      quote_expires_at,
      status: "offered",
      index_statement: statement,
      index_signature,
      accept_statement: null,
      accept_signature: null,
    });
    return NextResponse.json({
      function: "receipt",
      offer_id,
      form_id: FORM_ID,
      form_hash,
      form_text: loadFormText(),
      interrogator_key_id,
      query,
      fee_amount: fee.fee_amount,
      fee_currency: fee.fee_currency,
      fee_account: fee.fee_account,
      rail: fee.rail,
      not_genius_usd: fee.not_genius_usd,
      quote_expires_at,
      will_return: ["ldedi-query-receipt-1.0", "envelope", "served rows for this query"],
      index_statement: statement,
      index_signature,
      accept: "POST /api/v1/receipt/accept-mvp",
      note: "Offer under FS-RECEIPT-1.0. Pay the stand-in 0.10 on accept-mvp to receive the signed receipt. This is not an LDI query and not GENIUS USD.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "receipt_offer_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
