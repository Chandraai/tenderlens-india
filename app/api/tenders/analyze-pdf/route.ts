import { NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import { mergeBoqExcelAnalysis } from "@/lib/boq-excel";
import { analyzeTenderText } from "@/lib/tender-analysis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const boqFile = formData.get("boqFile");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "PDF file is required" }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parser = new PDFParse({ data: buffer });
    const parsed = await parser.getText();
    await parser.destroy();
    const text = parsed.text?.trim();

    if (!text) {
      return NextResponse.json({ error: "Could not extract readable text from this PDF" }, { status: 422 });
    }

    let analysis = analyzeTenderText(file.name, text);

    if (boqFile instanceof File && boqFile.name && /\.(xls|xlsx)$/i.test(boqFile.name)) {
      const boqBuffer = Buffer.from(await boqFile.arrayBuffer());
      analysis = mergeBoqExcelAnalysis(analysis, boqFile.name, boqBuffer);
    }

    return NextResponse.json({ analysis });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown PDF parsing error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
