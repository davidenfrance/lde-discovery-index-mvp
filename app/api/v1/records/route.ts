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
import type { CapabilityRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

function wantsGate(req: NextRequest, searchParams: URLSearchParams): boolean {
  const q = (searchParams.get("gate") || searchParams.get("receipt") || "").toLowerCase();
  if (q === "1" || q === "true" || q === "yes") return true;
  const h = (req.headers.get("x-ldedi-gate") || "").toLowerCase();
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

    const headerKey =
      req.headers.get("x-ldedi-interrogator-key") ||
      searchParams.get("interrogator_key");
    const interrogator = parseInterrogatorKey(headerKey);
    if (headerKey && !interrogator) {
      return NextResponse.json({ error: "invalid_interrogator_key" }, { status: 400 });
    }

    if (!interrogator) {
      const thin = records.map(toThin);
      return NextResponse.json({
        count: thin.length,
        grade: "thin",
        receipts: false,
        records: thin,
        note: "Thin public list. No mandate, value band or listing signature. Send X-LDEDI-Interrogator-Key for the fat row. Gating function is required for a signed receipt.",
      });
    }

    const query = declaredQuery({
      task: searchParams.get("task"),
      jurisdiction: searchParams.get("jurisdiction"),
      firm: searchParams.get("firm"),
      verification: searchParams.get("verification"),
      language: searchParams.get("language"),
    });

    if (!wantsGate(req, searchParams)) {
      return NextResponse.json({
        count: records.length,
        grade: "fat",
        receipts: false,
        records,
        note: "Fat row. Diligence only. Add gate=1 after POST /api/v1/gate/offer and POST /api/v1/gate/accept-mvp to receive a signed receipt.",
      });
    }

    const acceptId = searchParams.get("accept_id") || searchParams.get("offer_id");
    const open = process.env.OPEN_GATE_RECEIPTS === "true";
    if (!open) {
      if (!acceptId) {
        return NextResponse.json(
          {
            error: "gating_function_required",
            form_id: FORM_ID,
            offer: "POST /api/v1/gate/offer",
            accept: "POST /api/v1/gate/accept-mvp",
            note: "A live LDEDI receipt is issued only after the gating function. Stand-in 0.10 on accept-mvp is not GENIUS USD.",
          },
          { status: 403 }
        );
      }
      await ensureGateSchema();
      const offer = await getGateOffer(acceptId);
      if (!offer || offer.status !== "accepted") {
        return NextResponse.json({ error: "gate_accept_required" }, { status: 403 });
      }
      if (normalizeHex(offer.interrogator_key_id) !== interrogator) {
        return NextResponse.json({ error: "gate_interrogator_mismatch" }, { status: 403 });
      }
    }

    const issued = issueQueryReceipts(records, query, interrogator);
    return NextResponse.json({
      count: issued.records.length,
      grade: "gated",
      receipts: true,
      form_id: FORM_ID,
      accept_id: acceptId || null,
      query_id: issued.envelope.query_id,
      envelope: issued.envelope,
      records: issued.records,
      note: "Gating function complete. Each row carries an index-signed receipt. Session hosts should refuse opens without a live receipt for their key_id.",
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
