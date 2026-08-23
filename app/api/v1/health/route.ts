import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "lde-discovery-index-mvp",
    stores: ["capability_records", "revocation"],
    not_on_this_host: ["locator", "pinned_keys", "first_service_identity"],
    currency: "GENIUS_USD",
  });
}
