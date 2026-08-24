import { NextResponse } from "next/server";
import { signIndexIdentity } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Wallet AI calls this after resolving the burned locator.
 * Verifies the response with the index public key burned into the wallet with the locator.
 * If verification fails, the index is treated as fake.
 */
export async function GET() {
  try {
    const issued_at = new Date().toISOString();
    const signed = signIndexIdentity({
      index_id: process.env.INDEX_ID || "lde-discovery-index-mvp",
      service: "lde-discovery-index-mvp",
      issued_at,
    });
    return NextResponse.json({
      index_id: process.env.INDEX_ID || "lde-discovery-index-mvp",
      service: "lde-discovery-index-mvp",
      issued_at,
      statement: signed.statement,
      signature: signed.signature,
      index_public_key_hex: signed.public_key_hint || null,
      note: "Verify signature with the index public key burned into the wallet with the locator. Locator is burned into the wallet; do not trust a counterparty URL.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "index_identity_unavailable";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
