import { createHash } from "crypto";

export const TERMS_ID = "LDEDI-TERMS-1.0";
export const TERMS_TEXT = "LDEDI Terms of Use 1.0\nLondon Digital Escrow Limited (company 12471868)\nThe Engine Room, Battersea Power Station, 18 The Power Station, London, SW11 8BZ\ninfo@LondonDigitalEscrow.com\nForm date: 7 September 2026\n\nThese terms govern unpaid use of the London Digital Escrow Discovery Index. They are not FS-RECEIPT-1.0 and not an LDI query or bind.\n\n1. Audience\nThe Index is offered only to persons aged 18 or over acting in a trade, business or profession. It is not a service for children. A child must not send a request or open a session.\n\n2. What a thin or fat look is\nA look at listings without a paid Receipt is a licence to read a directory extract the listed person asked the Company to publish. No contract is formed by that look. It is not insurance, not a confirmation of identity, not a query to London Digital Insurance Limited, and not a Receipt.\n\n3. First contract\nA contract with the Company for a signed Receipt is made only under form FS-RECEIPT-1.0 after an offer, a signed acceptance, and cleared funds. The fee is stated in the offer, not in these terms.\n\n4. Enquirer\nIf software sends the request, the Enquirer is the natural person who controls that software, if they can be shown, and otherwise the person who controls the sending address.\n\n5. Governing law and courts\nThese terms and every use of the Index are governed by the law of England and Wales. The courts of England and Wales have exclusive jurisdiction. Notices to the Company: the address and email above. Notices to the Enquirer may be sent to the technical address from which the request was made.\n\n6. No warranty on an unpaid look\nThe Company does not warrant that a person named on a listing controls the listed key. Liability for an unpaid look is limited to withdrawing the listing. Liability for a paid Receipt is limited as set out in FS-RECEIPT-1.0. Nothing excludes liability for fraud or for death or personal injury caused by negligence.\n\n7. Third parties\nThe Contracts (Rights of Third Parties) Act 1999 does not apply except that a person named on a listing may demand that their own row be taken down.\n\n8. Notice is not acceptance of FS-RECEIPT-1.0\nSeeing these terms or a listing is notice only. Acceptance of a Receipt contract requires the signed offer described in FS-RECEIPT-1.0.\n\nLDEDI Terms of Use 1.0  |  London Digital Escrow Limited\n";

export function termsHash(): string {
  return createHash("sha256").update(TERMS_TEXT, "utf8").digest("hex");
}

export function termsPublicUrl(reqUrl?: string): string {
  const env = process.env.INDEX_PUBLIC_BASE;
  if (env) return env.replace(/\/$/, "") + "/api/v1/terms";
  if (reqUrl) {
    try {
      const u = new URL(reqUrl);
      return `${u.origin}/api/v1/terms`;
    } catch {
      /* fall through */
    }
  }
  return "https://www.londonagenticnetwork.com/api/v1/terms";
}

export function termsNotice(reqUrl?: string) {
  return {
    terms_id: TERMS_ID,
    terms_url: termsPublicUrl(reqUrl),
    terms_hash: termsHash(),
    governing_law: "England and Wales",
    exclusive_jurisdiction: "courts of England and Wales",
    audience: "18 or over, trade business or profession only. Not a service for children.",
    unpaid_look: "Directory licence only. Not a contract, not insurance, not an LDI query, not a Receipt.",
    first_contract: "FS-RECEIPT-1.0 after offer, signed acceptance and cleared funds.",
  };
}
