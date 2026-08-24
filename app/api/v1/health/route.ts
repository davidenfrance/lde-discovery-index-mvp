import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "lde-discovery-index-mvp",
    stores: ["capability_records", "revocation"],
    auth: {
      wallet_allow_list: false,
      capability_records: "signed_with_wallet_id_public_key_bound_on_record",
      index_authenticity: "wallet_verifies_index_identity_with_burned_locator_index_public_key",
    },
    burned_into_wallet: ["locator", "index_public_key", "wallet_id_public_key"],
    not_on_this_host: ["locator", "pinned_keys", "first_service_identity", "wallet_private_keys"],
    currency: "GENIUS_USD",
  });
}
