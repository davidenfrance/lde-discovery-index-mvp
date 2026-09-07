import { NextRequest, NextResponse } from "next/server";
import { TERMS_ID, TERMS_TEXT, termsHash, termsNotice } from "@/lib/terms";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const format = new URL(req.url).searchParams.get("format") || "";
  if (format === "txt" || format === "text" || req.headers.get("accept") === "text/plain") {
    return new NextResponse(TERMS_TEXT, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-LDEDI-Terms-Id": TERMS_ID,
        "X-LDEDI-Terms-Hash": termsHash(),
      },
    });
  }
  return NextResponse.json({
    ...termsNotice(req.url),
    form_text: TERMS_TEXT,
  });
}
