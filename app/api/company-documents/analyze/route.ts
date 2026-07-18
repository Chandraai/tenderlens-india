import { NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import { analyzeCompanyDocument } from "@/lib/company-doc-analysis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Company document PDF is required" }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Only PDF files are supported for document intelligence" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parser = new PDFParse({ data: buffer });
    const parsed = await parser.getText();
    await parser.destroy();
    const text = parsed.text?.trim();

    if (!text) {
      return NextResponse.json({ error: "Could not extract readable text from this company document" }, { status: 422 });
    }

    return NextResponse.json({ document: analyzeCompanyDocument(file.name, text) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown company document parsing error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
