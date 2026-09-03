import { NextRequest, NextResponse } from "next/server";
import { createPublicKey, verify } from "crypto";
import { normalizeHex } from "@/lib/auth";
import {
  RECEIPT_ACTION,
  canonicalQueryReceipt,
  type QueryReceipt,
} from "@/lib/receipt";

export const dynamic = "force-dynamic";

function verifyEd25519(message: string, publicKeyHex: string, signatureHex: string): boolean {
  try {
    const raw = Buffer.from(normalizeHex(publicKeyHex), "hex");
    if (raw.length !== 32) return false;
    const key = createPublicKey({
      key: { kty: "OKP", crv: "Ed25519", x: raw.toString("base64url") },
      format: "jwk",
    });
    const sig = Buffer.from(normalizeHex(signatureHex), "hex");
    return verify(null, Buffer.from(message, "utf8"), key, sig);
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const receipt = (await req.json()) as QueryReceipt;
    if (!receipt || receipt.action !== RECEIPT_ACTION) {
      return NextResponse.json({ ok: false, error: "not_a_query_receipt" }, { status: 400 });
    }
    const burned = normalizeHex(process.env.INDEX_PUBLIC_KEY_HEX || "");
    const hint = normalizeHex(receipt.index_public_key_hex || "");
    if (hint && burned && hint !== burned) {
      return NextResponse.json({
        ok: false,
        error: "index_public_key_mismatch",
        hint,
        burned,
      }, { status: 401 });
    }
    const { signature, index_public_key_hex: _hint, ...body } = receipt;
    const statement = canonicalQueryReceipt(body);
    const valid = verifyEd25519(statement, burned, signature);
    const now = Date.now();
    const expires = Date.parse(receipt.receipt_expires_at);
    const live = Number.isFinite(expires) && now < expires;
    return NextResponse.json({
      ok: valid,
      live,
      expired: valid && !live,
      receipt_id: receipt.receipt_id,
      query_id: receipt.query_id,
      key_id: receipt.key_id,
      interrogator_key_id: receipt.interrogator_key_id,
      queried_at: receipt.queried_at,
      receipt_expires_at: receipt.receipt_expires_at,
      index_id: receipt.index_id,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "verify_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
