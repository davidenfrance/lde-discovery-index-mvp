import { NextRequest, NextResponse } from "next/server";
import { ensureSchema, listLiveRecords, upsertRecord } from "@/lib/db";
import { verifyPublishSignature } from "@/lib/auth";
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
    });
    return NextResponse.json({
      count: records.length,
      records,
      note: "Revoked records are not returned. Locator and First Service are not on this host.",
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
      return NextResponse.json({ error: "unsigned_or_unrecognised_wallet_ai" }, { status: 401 });
    }
    const saved = await upsertRecord({
      ...body,
      endpoints: body.endpoints || {},
      status: "active",
    });
    return NextResponse.json({ ok: true, record: saved }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "publish_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
