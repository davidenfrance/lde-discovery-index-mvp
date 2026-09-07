import { NextRequest, NextResponse } from "next/server";
import { ensureSchema, listLiveRecords, upsertRecord } from "@/lib/db";
import { normalizeHex, verifyPublishSignature } from "@/lib/auth";
import {
  declaredQuery,
  issueQueryReceipts,
  parseInterrogatorKey,
} from "@/lib/receipt";
import { toThin } from "@/lib/thin";
import { FORM_ID } from "@/lib/gate-form";
import { ensureGateSchema, getGateOffer } from "@/lib/gate-offers";
import { termsNotice } from "@/lib/terms";
import type { CapabilityRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

function wantsReceipt(req: NextRequest, searchParams: URLSearchParams): boolean {
  const q = (searchParams.get("receipt") || searchParams.get("gate") || "").toLowerCase();
  if (q === "1" || q === "true" || q === "yes") return true;
  const h = (req.headers.get("x-ldedi-receipt") || req.headers.get("x-ldedi-gate") || "").toLowerCase();
  return h === "1" || h === "true";
}

export async function GET(req: NextRequest) {
  try {
    await ensureSchema();
    const { searchParams } = new URL(req.url);
    const max = searchParams.get("max_usd");
    const records = await listLiveRecords({
      task: searchParams.get("task") || undefined,
      jurisdiction: searchParams.get("jurisdiction") || undefined,
      currency: searchParams.get("currency") || undefined,
      max_usd: max ? Number(max) : undefined,
      firm: searchParams.get("firm") || undefined,
    });
    const terms = termsNotice(req.url);

    const headerKey =
      req.headers.get("x-ldedi-interrogator-key") ||
      searchParams.get("interrogator_key");
    const interrogator = parseInterrogatorKey(headerKey);
    if (headerKey && !interrogator) {
      return NextResponse.json({ error: "invalid_interrogator_key", terms }, { status: 400 });
    }

    if (!interrogator) {
      const thin = records.map(toThin);
      return NextResponse.json({
        count: thin.length,
        grade: "thin",
        receipts: false,
        terms,
        records: thin,
        note: "Thin public list. Notice of LDEDI-TERMS-1.0 only. No contract. No mandate, value band or listing signature. Adults in trade only. Send X-LDEDI-Interrogator-Key for the fat row. Pay for a signed receipt at POST /api/v1/receipt/offer.",
      });
    }

    const query = declaredQuery({
      task: searchParams.get("task"),
      jurisdiction: searchParams.get("jurisdiction"),
      firm: searchParams.get("firm"),
      verification: searchParams.get("verification"),
      language: searchParams.get("language"),
    });

    if (!wantsReceipt(req, searchParams)) {
      return NextResponse.json({
        count: records.length,
        grade: "fat",
        receipts: false,
        terms,
        records,
        note: "Fat row. Diligence only. Notice of LDEDI-TERMS-1.0 only. Not a Receipt. Buy a receipt: POST /api/v1/receipt/offer then POST /api/v1/receipt/accept-mvp.",
      });
    }

    const acceptId = searchParams.get("accept_id") || searchParams.get("offer_id");
    const open = process.env.OPEN_GATE_RECEIPTS === "true" || process.env.OPEN_RECEIPTS === "true";
    if (!open) {
      if (!acceptId) {
        return NextResponse.json(
          {
            error: "receipt_required",
            form_id: FORM_ID,
            offer: "POST /api/v1/receipt/offer",
            accept: "POST /api/v1/receipt/accept-mvp",
            terms,
            note: "A live LDEDI receipt is issued only after you pay the stand-in 0.10 on accept-mvp. That is not GENIUS USD and not an LDI query. Seeing the listing is not acceptance of FS-RECEIPT-1.0.",
          },
          { status: 403 }
        );
      }
      await ensureGateSchema();
      const offer = await getGateOffer(acceptId);
      if (!offer || offer.status !== "accepted") {
        return NextResponse.json({ error: "receipt_accept_required", terms }, { status: 403 });
      }
      if (normalizeHex(offer.interrogator_key_id) !== interrogator) {
        return NextResponse.json({ error: "receipt_interrogator_mismatch", terms }, { status: 403 });
      }
    }

    const issued = issueQueryReceipts(records, query, interrogator);
    return NextResponse.json({
      count: issued.records.length,
      grade: "receipt",
      receipts: true,
      form_id: FORM_ID,
      accept_id: acceptId || null,
      query_id: issued.envelope.query_id,
      envelope: issued.envelope,
      terms,
      records: issued.records,
      note: "Receipt paid under FS-RECEIPT-1.0. Each row carries an index-signed receipt. English law. Session hosts should refuse opens without a live receipt for their key_id.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "query_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureSchema();
    const body = (await req.json()) as CapabilityRecord;
    const required = [
      "record_id",
      "agent_id",
      "principal_id",
      "tasks",
      "jurisdiction",
      "settlement_currency",
      "value_band_usd_min",
      "value_band_usd_max",
      "issued_at",
      "expires_at",
      "key_id",
      "signature",
    ];
    for (const key of required) {
      if ((body as Record<string, unknown>)[key] == null) {
        return NextResponse.json({ error: `missing_${key}` }, { status: 400 });
      }
    }
    if (!Array.isArray(body.tasks) || body.tasks.length === 0) {
      return NextResponse.json({ error: "tasks_required" }, { status: 400 });
    }
    if (!verifyPublishSignature(body)) {
      return NextResponse.json({ error: "invalid_wallet_signature" }, { status: 401 });
    }
    const saved = await upsertRecord({
      ...body,
      key_id: normalizeHex(body.key_id),
      endpoints: body.endpoints || {},
      status: "active",
    });
    return NextResponse.json({ ok: true, record: saved }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "publish_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
