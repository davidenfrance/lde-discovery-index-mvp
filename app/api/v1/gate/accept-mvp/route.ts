import { NextRequest, NextResponse } from "next/server";
import { normalizeHex } from "@/lib/auth";
import { ensureSchema, listLiveRecords } from "@/lib/db";
import {
  FORM_ID,
  formHash,
  feeFromEnv,
  canonicalAccept,
  verifyInterrogatorSignature,
  MVP_RAIL,
} from "@/lib/gate-form";
import { ensureGateSchema, getGateOffer, markGateAccepted } from "@/lib/gate-offers";
import { declaredQuery, issueQueryReceipts } from "@/lib/receipt";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await ensureGateSchema();
    await ensureSchema();
    const body = (await req.json()) as {
      offer_id?: string;
      interrogator_key_id?: string;
      signature?: string;
      settlement?: string;
    };
    if (!body.offer_id || !body.interrogator_key_id || !body.signature) {
      return NextResponse.json(
        { error: "offer_id_interrogator_key_id_signature_required" },
        { status: 400 }
      );
    }
    const offer = await getGateOffer(body.offer_id);
    if (!offer) return NextResponse.json({ error: "offer_not_found" }, { status: 404 });
    if (offer.status === "accepted") {
      return NextResponse.json({ error: "offer_already_accepted" }, { status: 409 });
    }
    if (new Date(offer.quote_expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: "offer_expired" }, { status: 410 });
    }
    if (normalizeHex(offer.interrogator_key_id) !== normalizeHex(body.interrogator_key_id)) {
      return NextResponse.json({ error: "interrogator_key_mismatch" }, { status: 403 });
    }
    if (offer.form_id !== FORM_ID || offer.form_hash !== formHash()) {
      return NextResponse.json({ error: "form_hash_mismatch" }, { status: 409 });
    }
    const fee = feeFromEnv();
    const statement = canonicalAccept({
      offer_id: offer.offer_id,
      form_id: offer.form_id,
      form_hash: offer.form_hash,
      interrogator_key_id: offer.interrogator_key_id,
      fee_amount: offer.fee_amount,
      fee_currency: offer.fee_currency,
      rail: MVP_RAIL,
    });
    if (!verifyInterrogatorSignature(statement, body.interrogator_key_id, body.signature)) {
      return NextResponse.json({ error: "invalid_interrogator_signature" }, { status: 401 });
    }
    await markGateAccepted(offer.offer_id, statement, body.signature);
    let query;
    try {
      query = JSON.parse(offer.query_json);
    } catch {
      query = declaredQuery({});
    }
    const records = await listLiveRecords({
      task: query.task || undefined,
      jurisdiction: query.jurisdiction || undefined,
      firm: query.firm || undefined,
    });
    const issued = issueQueryReceipts(records, declaredQuery(query), offer.interrogator_key_id);
    return NextResponse.json({
      accepted: true,
      function: "gating_function",
      settlement: "mvp",
      not_genius_usd: true,
      rail: MVP_RAIL,
      offer_id: offer.offer_id,
      form_id: FORM_ID,
      fee_amount: offer.fee_amount,
      fee_currency: offer.fee_currency,
      count: issued.records.length,
      grade: "gated",
      receipts: true,
      query_id: issued.envelope.query_id,
      envelope: issued.envelope,
      records: issued.records,
      note: "Gating function accepted on settle-mvp. Receipts issued. This is not GENIUS USD and not an LDI query.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "gate_accept_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
