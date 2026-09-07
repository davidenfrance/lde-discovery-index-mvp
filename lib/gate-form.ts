import { createHash, createPublicKey, verify } from "crypto";
import { normalizeHex, signWithPem } from "./auth";

export const FORM_ID = "FS-RECEIPT-1.0";
export const FORM_ID_LEGACY = "FS-GATE-1.0";
export const MVP_ASSET = "RECEIPT_MVP";
export const MVP_RAIL = "settle-mvp";

export const FORM_TEXT = `LONDON DIGITAL ESCROW LIMITED
Discovery Index
Receipt Contract
Standard form FS-RECEIPT-1.0
This is a contract for a paid, signed, time-limited receipt of what the London Digital Escrow Discovery Index served on one request. The amount of the fee is not set out in this form so that the fee may be changed without issuing a new form.
Governing law: England and Wales. Form date: 7 September 2026.
Purpose of this form
This form records what a person (including a person acting through software) buys when they pay the receipt fee. It is intended to be read and, if necessary, construed by a solicitor and counsel in England and Wales. Technical labels used in systems are explained in ordinary language. Nothing in this form depends on the enquirer using any particular device brand.
Defined terms
In this form:
"Index" means the London Digital Escrow Discovery Index operated by the Company, presently reached at the locator published by the Company.
"Capability record" means a listing the Index holds about a person or firm and the software through which they may be contacted.
"Receipt" means the short signed statement the Company issues after the fee has cleared, recording what the Index served on that request, to whom, and when that statement ceases to be current.
"Authenticating Device" means the device or system under a person's exclusive control that can authenticate an instruction given by that person or by software acting for that person.
An automated agent is software that may give instructions only when authenticated by an Authenticating Device.
The company
The company is London Digital Escrow Limited ("the Company").
Company number: 12471868.
Address for service: The Engine Room, Battersea Power Station, 18 The Power Station, London, SW11 8BZ.
Email: info@LondonDigitalEscrow.com
The Company operates the Index. Through the Index a person may look at listings without paying (a thin or fat look). Separately, a person may pay a fee and receive a Receipt. That paid Receipt is the subject of this contract.
London Digital Insurance Limited is not a party to this contract. A query to that company, and any identity insurance later bound with that company, are different contracts with different forms and different prices. This form is not those contracts.
1. Identity of this wording
This wording is form FS-RECEIPT-1.0. Each paid receipt must refer to this form by that name. If the Company later changes this wording it will issue a new form number. The fee charged for a receipt is not part of this wording.
2. Who the parties are
One party is the Company.
The other party is the person who pays the receipt fee and asks for the Receipt ("the Enquirer"). The Enquirer may be unknown to the Company except for the technical address from which the request is sent. The Enquirer need not hold an Authenticating Device issued by any named provider, need not have identified themselves to a solicitor, and need not have given a postal address. This form treats the Enquirer as anonymous except so far as the request itself identifies a sending address.
The Enquirer may act through software. Where software sends the request and pays the fee, the Enquirer is the person on whose behalf that software acts, if that person can be shown, and otherwise the person who controls the sending address.
A person named on a capability record is not a party to this contract. Facts about that person appear only in the listing, if one is served, and in the Receipt, if one is issued.
3. How the contract is made
Each receipt purchase is a separate contract. The contract is made only when all of the following have happened:
the Company has offered to issue a Receipt under this form, and has stated the fee, the currency, and the account or wallet to which the fee must be paid;
the Enquirer has accepted that offer, by a signature or other durable electronic acceptance that refers to this form and to that offer; and
the fee stated in that offer has been received in cleared funds in the account or wallet named in the offer.
If the fee is not received, there is no contract and the Company need not issue a Receipt.
The amount of the fee is whatever the offer states. A change in the fee does not change this form. It only requires a new offer.
On the Company's MVP rail the fee is a stand-in and is not GENIUS USD. In production the same form is settled in GENIUS USD wallet-to-wallet. A stand-in payment does not become GENIUS USD by being described as a fee.
The fee is the price of the licence in clause 4. It is not a premium for insurance. It is not a query fee charged by London Digital Insurance Limited.
4. What the Enquirer buys
In return for the fee the Company will either:
issue one Receipt about the listings served on that request; or
issue a written refusal, stating that no Receipt will be given (for example because no matching listing is in force, the request is refused, or the offer has expired).
A Receipt is a short statement, signed by or for the Company, which at a minimum records:
a unique reference for that Receipt;
the date and time it was issued;
the time at which it ceases to be capable of being relied on as a current statement;
the Enquirer's sending address used on that request;
the capability record or records served;
a digest of what was served, so that a later reader can see whether the row was altered after the Receipt was issued; and
the session address stated on the listing, if one was served.
The Receipt speaks only at the time it is issued. It is evidence of what the Index served on that request. It is not a warranty that the person named on the listing is who they say they are. It is not a policy of insurance. It is not a query to London Digital Insurance Limited. It is not a promise that the listing will remain current after the Receipt expires.
Unless the offer states a shorter period, a Receipt may not be treated as current for more than two minutes after it is issued. The Company may state a shorter period in the offer.
5. What the Enquirer does not buy
Payment of the receipt fee does not give the Enquirer:
insurance, an indemnity, a sum insured, or the right to claim on a policy;
any confirmation by London Digital Insurance Limited of a Recorded Controller or of cover in force;
any right under the Contracts (Rights of Third Parties) Act 1999 in respect of a policy issued to someone else;
a right to require the Company to offer or bind identity insurance;
a right to require a person named on a listing to sign anything, or to use a hardware device;
a right to transfer money to or from any Authenticating Device; or
a right to copy, sell, publish, scrape, or use the listings or the Receipt as a directory or as training material.
A look at the Index without this fee (a thin or fat look) is not a Receipt and may not be presented as one.
If the Enquirer wants insurance against a recorded name being wrong, that requires a separate contract with London Digital Insurance Limited and a separate premium. That separate contract is not this form.
6. What the Enquirer agrees
By accepting the offer and paying the fee the Enquirer agrees that:
this form FS-RECEIPT-1.0 is the contract for that fee;
the fee is the amount in the offer, not an amount printed here;
the Receipt, if issued, is a statement of what the Index served only;
the Enquirer will not tell any other person that this fee bought insurance cover or an LDI query;
the Enquirer may show an unexpired Receipt to a session host or to London Digital Insurance Limited as evidence of this interrogation;
any later payment of a price, deposit or other consideration in a commercial deal is a separate matter; and
the Enquirer is either acting for themselves or, if acting for another, has authority to pay the fee and to accept these terms.
7. The Company's duties and limit of liability
The Company will issue the Receipt described in the offer, or a written refusal, after the fee has cleared.
The Company answers from the Index at the time of signing. It is not required to call a person named on a listing or to require that person to operate a hardware device in order to issue a Receipt.
If the Company is in breach of this contract, its liability is limited to repayment of the fee actually received for that Receipt. The Company is not liable for loss of bargain, loss of a later transaction, or other consequential loss. The Company does not advise the Enquirer and does not guarantee the future conduct of any person named on a listing.
Nothing in this clause excludes liability for fraud or for death or personal injury caused by negligence, or any other liability which English law does not allow to be limited.
8. Use of the Receipt and records
The Enquirer may use a Receipt only, during the period in which it remains current, as evidence of this interrogation when speaking to a session host or when paying for an LDI query.
The Company may keep the offer, the acceptance, evidence of payment, the Receipt or refusal, and this form, for its records and for any later dispute.
A copied listing on another site is not a Receipt. A Receipt that has expired is not current.
9. When the contract starts and ends
The contract starts when the fee for a live offer is received in cleared funds. It ends when the Receipt or refusal is issued, except that clauses 5, 6, 7, 8, 10 and 11 continue.
An offer which is not accepted and paid before the time stated in the offer lapses without further notice.
10. Notices
Notices to the Company must be sent to info@LondonDigitalEscrow.com and in writing to The Engine Room, Battersea Power Station, 18 The Power Station, London, SW11 8BZ.
Notices to the Enquirer may be sent to the technical address from which the request was made. If the Enquirer has given no other address, that is sufficient.
11. Governing law and jurisdiction
This form and each offer under it are governed by the law of England and Wales. The courts of England and Wales have exclusive jurisdiction. The parties submit to that jurisdiction.
12. What the offer must contain
The Company's offer (the document the Enquirer accepts) must state at least:
Form name: FS-RECEIPT-1.0, so it is clear which wording applies.
Offer reference: a unique number for this receipt purchase.
Fee and currency: the sum to be paid. Not printed in this form.
Where to pay: the Company's account or wallet for that fee.
Rail: MVP stand-in or production GENIUS USD.
Which listings: the filter used on that request, if any.
When the offer dies: after this time the Enquirer cannot accept.
Life of the Receipt: how long the Receipt remains current.
Enquirer's sending address: how the Enquirer is reached for this request.
The Enquirer's acceptance applies to those items and to this form. It does not accept a policy of insurance. It does not accept an LDI query.
13. Later insurance or LDI query, if wanted
If the Enquirer later wants London Digital Insurance Limited to confirm a Recorded Controller or to bind identity insurance, that is a different contract with a different form and a different price. Nothing in this form creates that insurance, fixes a sum insured, or requires a person named on a listing to attend a device. This receipt contract remains only the contract for the paid Index Receipt.
Form FS-RECEIPT-1.0  |  London Digital Escrow Limited
`;

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
