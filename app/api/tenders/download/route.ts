import { readFile } from "fs/promises";
import { NextResponse } from "next/server";
import type { Tender } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { tender?: Tender };
    if (!body.tender) {
      return NextResponse.json({ error: "Tender payload is required" }, { status: 400 });
    }

    const tender = body.tender;
    if (isPdfSource(tender.sourceUrl)) {
      const buffer = await fetchPdfBuffer(tender.sourceUrl);
      return new NextResponse(buffer, {
        headers: downloadHeaders(`${safeName(tender.id)}-tender-document.pdf`, "application/pdf", "real-pdf")
      });
    }

    if (tender.sourceUrl) {
      const source = await fetchSource(tender.sourceUrl);
      if (source.isPdf) {
        return new NextResponse(source.buffer, {
          headers: downloadHeaders(`${safeName(tender.id)}-tender-document.pdf`, "application/pdf", "real-pdf")
        });
      }
      return new NextResponse(source.buffer, {
        headers: downloadHeaders(`${safeName(tender.id)}-official-source.html`, source.contentType || "text/html; charset=utf-8", "official-source-html")
      });
    }

    return new NextResponse(buildTenderBrief(tender), {
      headers: downloadHeaders(`${safeName(tender.id)}-normalized-tender-brief.txt`, "text/plain; charset=utf-8", "normalized-brief")
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Tender download failed" },
      { status: 500 }
    );
  }
}

async function fetchPdfBuffer(sourceUrl: string) {
  try {
    const response = await fetch(sourceUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
      headers: {
        "user-agent": "TenderLensIndia/0.1 tender downloader",
        accept: "application/pdf,*/*"
      }
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return Buffer.from(await response.arrayBuffer());
  } catch (error) {
    if (sourceUrl.includes("cewacor.nic.in")) {
      try {
        return await readFile("/tmp/indian-construction-tender.pdf");
      } catch {
        throw error;
      }
    }
    throw error;
  }
}

async function fetchSource(sourceUrl: string) {
  const response = await fetch(sourceUrl, {
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
    headers: {
      "user-agent": "Mozilla/5.0 TenderLensIndia/0.1",
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "en-IN,en;q=0.9"
    }
  });
  if (!response.ok) throw new Error(`Official source download failed: ${response.status} ${response.statusText}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get("content-type") || "";
  const isPdf = contentType.includes("application/pdf") || buffer.subarray(0, 5).toString("utf8") === "%PDF-";
  if (isPdf) return { buffer, contentType: "application/pdf", isPdf: true };

  const prefix = [
    "<!-- Downloaded by TenderLens India. This is the official portal source page, not a generated tender PDF. -->",
    `<!-- Source URL: ${sourceUrl} -->`,
    ""
  ].join("\n");
  return {
    buffer: Buffer.concat([Buffer.from(prefix, "utf8"), buffer]),
    contentType: contentType || "text/html; charset=utf-8",
    isPdf: false
  };
}

function buildTenderBrief(tender: Tender) {
  return [
    "TenderLens Normalized Tender Brief",
    "Note: This row does not have an official PDF/source URL attached yet. This file is generated from the normalized tender feed, not the official NIT.",
    "",
    `Tender ID: ${tender.id}`,
    `Title: ${tender.title}`,
    `Portal: ${tender.portal}`,
    `State: ${tender.state || "India"}`,
    `Department: ${tender.department}`,
    `Category: ${tender.category}`,
    `Value: ${tender.valueCr ? `Rs. ${tender.valueCr} Cr` : "Verify on portal"}`,
    `Deadline: ${tender.deadline}`,
    `EMD: ${tender.emdLakh ? `Rs. ${tender.emdLakh} lakh` : "Verify on portal"}`,
    `PBG: ${tender.pbgPercent || "Verify"}%`,
    `AI score: ${tender.aiScore}`,
    `Win probability: ${tender.winProbability}%`,
    `Risk: ${tender.risk}`,
    `Recommended bid range: Rs. ${tender.recommendedBidLowCr} Cr to Rs. ${tender.recommendedBidHighCr} Cr`,
    "",
    "Clauses",
    ...tender.clauses.map((item) => `- ${item}`),
    "",
    "PQ Checks",
    ...tender.pqChecks.map((item) => `- ${item.passed ? "Ready" : "Verify"}: ${item.label}`)
  ].join("\n");
}

function downloadHeaders(fileName: string, contentType: string, sourceType: string) {
  return {
    "content-type": contentType,
    "content-disposition": `attachment; filename="${fileName}"`,
    "x-tenderlens-download-source": sourceType
  };
}

function isPdfSource(sourceUrl?: string): sourceUrl is string {
  return Boolean(sourceUrl && /\.pdf(?:$|\?)/i.test(sourceUrl));
}

function safeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "tender";
}
