import { NextResponse } from "next/server";

const adapters = [
  { portal: "GeM", mode: "api-or-scrape", cadence: "15 min", status: "requires credentials" },
  { portal: "CPPP", mode: "feed-scrape", cadence: "30 min", status: "ready" },
  { portal: "UP State", mode: "state-adapter", cadence: "60 min", status: "ready" },
  { portal: "MP State", mode: "state-adapter-signal", cadence: "60 min", status: "portal token/session signal mode" },
  { portal: "Delhi NCR", mode: "state-adapter-signal", cadence: "60 min", status: "portal token/session signal mode" },
  { portal: "DEFPROC Defence", mode: "defence-adapter-signal", cadence: "60 min", status: "official source signal mode" },
  { portal: "Maharashtra State", mode: "state-adapter", cadence: "60 min", status: "ready" },
  { portal: "Rajasthan State", mode: "state-adapter", cadence: "60 min", status: "ready" }
];

export async function POST() {
  return NextResponse.json({
    ok: true,
    syncedAt: new Date().toISOString(),
    adapters,
    note: "Production sync should respect each portal's terms, rate limits, credentials and captcha boundaries."
  });
}
