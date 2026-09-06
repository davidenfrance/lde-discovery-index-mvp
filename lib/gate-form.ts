import { createHash, createPublicKey, verify } from "crypto";
import { normalizeHex, signWithPem } from "./auth";

export const FORM_ID = "FS-RECEIPT-1.0";
export const FORM_ID_LEGACY = "FS-GATE-1.0";
export const MVP_ASSET = "RECEIPT_MVP";
export const MVP_RAIL = "settle-mvp";

export const FORM_TEXT = `FS-RECEIPT-1.0
London Digital Escrow Discovery Index receipt.

This form is consideration for a signed, time-limited receipt of what the index served on one request. It is not a query to London Digital Insurance Limited. It is not a bind and not insurance cover.

The fee amount is stated in the Offer, not in this form, so the amount can change. On the MVP rail the fee is a stand-in and is not GENIUS USD. In production the same form is settled in GENIUS USD wallet-to-wallet.

By signing the Offer acceptance the interrogating agent agrees that the receipt may be shown to a session host or to the LDI oracle as evidence of this interrogation, and that English law governs this form.

Issuer of the receipt: the LDEDI operator. The insurer named on LDI query forms is not a party to this receipt purchase.`;

export function loadFormText(): string {
  return FORM_TEXT;
}

export function formHash(text?: string): string {
  return createHash("sha256").update(text ?? loadFormText(), "utf8").digest("hex");
}

export function feeFromEnv() {
  return {
    fee_amount: process.env.RECEIPT_FEE_AMOUNT || process.env.GATE_FEE_AMOUNT || "0.10",
    fee_currency: process.env.RECEIPT_FEE_CURRENCY || process.env.GATE_FEE_CURRENCY || MVP_ASSET,
    fee_account: process.env.RECEIPT_FEE_ACCOUNT || process.env.GATE_FEE_ACCOUNT || "ldedi-receipt",
    rail: process.env.RECEIPT_FEE_RAIL || process.env.GATE_FEE_RAIL || MVP_RAIL,
    not_genius_usd: (process.env.RECEIPT_FEE_RAIL || process.env.GATE_FEE_RAIL) !== "genius-usd",
  };
}

export function canonicalOffer(o: {
  offer_id: string;
  form_id: string;
  form_hash: string;
  interrogator_key_id: string;
  query_json: string;
  fee_amount: string;
  fee_currency: string;
  fee_account: string;
  quote_expires_at: string;
}): string {
  return JSON.stringify({
    action: "receipt_offer",
    offer_id: o.offer_id,
    form_id: o.form_id,
    form_hash: o.form_hash,
    interrogator_key_id: normalizeHex(o.interrogator_key_id),
    query_json: o.query_json,
    fee_amount: o.fee_amount,
    fee_currency: o.fee_currency,
    fee_account: o.fee_account,
    quote_expires_at: o.quote_expires_at,
  });
}

export function canonicalAccept(o: {
  offer_id: string;
  form_id: string;
  form_hash: string;
  interrogator_key_id: string;
  fee_amount: string;
  fee_currency: string;
  rail: string;
}): string {
  return JSON.stringify({
    action: "receipt_accept",
    offer_id: o.offer_id,
    form_id: o.form_id,
    form_hash: o.form_hash,
    interrogator_key_id: normalizeHex(o.interrogator_key_id),
    fee_amount: o.fee_amount,
    fee_currency: o.fee_currency,
    rail: o.rail,
  });
}

export function signIndexMessage(message: string): string {
  const raw = process.env.INDEX_PRIVATE_KEY_PEM;
  if (!raw) throw new Error("INDEX_PRIVATE_KEY_PEM is not set");
  return signWithPem(message, raw);
}

export function verifyInterrogatorSignature(
  message: string,
  interrogator_key_id: string,
  signature: string
): boolean {
  try {
    const raw = Buffer.from(normalizeHex(interrogator_key_id), "hex");
    if (raw.length !== 32) return false;
    const key = createPublicKey({
      key: { kty: "OKP", crv: "Ed25519", x: raw.toString("base64url") },
      format: "jwk",
    });
    return verify(
      null,
      Buffer.from(message, "utf8"),
      key,
      Buffer.from(normalizeHex(signature), "hex")
    );
  } catch {
    return false;
  }
}
