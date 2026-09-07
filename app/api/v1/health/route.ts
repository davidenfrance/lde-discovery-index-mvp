import { NextResponse } from "next/server";
import { termsNotice } from "@/lib/terms";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "lde-discovery-index-mvp",
    stores: ["capability_records", "revocation", "gate_offers"],
    terms: termsNotice(),
    auth: {
      wallet_allow_list: false,
      capability_records: "signed_with_wallet_id_public_key_bound_on_record",
      index_authenticity: "wallet_verifies_index_identity_with_burned_locator_index_public_key",
    },
    grades: {
      thin: "GET /api/v1/records",
      fat: "GET /api/v1/records with X-LDEDI-Interrogator-Key",
      receipt: "POST /api/v1/receipt/offer then POST /api/v1/receipt/accept-mvp",
    },
    form_id: "FS-RECEIPT-1.0",
    terms_id: "LDEDI-TERMS-1.0",
    terms_url: "https://www.londonagenticnetwork.com/api/v1/terms",
    aliases: {
      "POST /api/v1/gate/offer": "POST /api/v1/receipt/offer",
      "POST /api/v1/gate/accept-mvp": "POST /api/v1/receipt/accept-mvp",
    },
    burned_into_wallet: ["locator", "index_public_key", "wallet_id_public_key"],
    not_on_this_host: ["locator", "pinned_keys", "first_service_identity", "wallet_private_keys"],
    currency: "GENIUS_USD",
    mvp_receipt_rail: "settle-mvp",
    mvp_receipt_not_genius_usd: true,
  });
}
