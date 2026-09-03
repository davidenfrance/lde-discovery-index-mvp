import { NextRequest, NextResponse } from "next/server";
import { ensureSchema, listLiveRecords, upsertRecord } from "@/lib/db";
import { normalizeHex, verifyPublishSignature } from "@/lib/auth";
import {
  declaredQuery,
  issueQueryReceipts,
  parseInterrogatorKey,
} from "@/lib/receipt";
import type { CapabilityRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

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
      return NextResponse.json({
        count: records.length,
        receipts: false,
        records,
        note: "Revoked records are not returned. Send X-LDEDI-Interrogator-Key (64 hex) to receive index-signed query receipts.",
      });
    }

    const query = declaredQuery({
      task: searchParams.get("task"),
      jurisdiction: searchParams.get("jurisdiction"),
      firm: searchParams.get("firm"),
      verification: searchParams.get("verification"),
      language: searchParams.get("language"),
    });
    const issued = issueQueryReceipts(records, query, interrogator);
    return NextResponse.json({
      count: issued.records.length,
      receipts: true,
      query_id: issued.envelope.query_id,
      envelope: issued.envelope,
      records: issued.records,
      note: "Each row carries an index-signed query receipt. Session hosts should refuse opens without a live receipt for their key_id.",
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
