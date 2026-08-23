import { NextRequest, NextResponse } from "next/server";
import { ensureSchema, revokeRecord } from "@/lib/db";
import { verifyRevokeSignature } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSchema();
    const { id } = await ctx.params;
    const body = (await req.json()) as { key_id?: string; signature?: string };
    if (!body.key_id || !body.signature) {
      return NextResponse.json({ error: "missing_signature" }, { status: 400 });
    }
    if (!verifyRevokeSignature(id, body.key_id, body.signature)) {
      return NextResponse.json({ error: "unsigned_or_unrecognised_wallet_ai" }, { status: 401 });
    }
    const found = await revokeRecord(id);
    if (!found) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({
      ok: true,
      record_id: id,
      status: "revoked",
      note: "Record will not appear on subsequent GET /v1/records queries.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "revoke_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
