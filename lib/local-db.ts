import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { Tender } from "@/lib/types";

type DashboardSnapshot = {
  id: string;
  createdAt: string;
  tenderCount: number;
  liveRows: number;
  pipelineCr: number;
  weightedPipelineCr: number;
  source: string;
};

type TenderLensDb = {
  version: 1;
  updatedAt: string;
  tenders: Tender[];
  dashboardSnapshots: DashboardSnapshot[];
};

const dbPath = path.join(process.cwd(), "data", "tenderlens-db.json");

export async function readLocalDb(): Promise<TenderLensDb> {
  try {
    const raw = await readFile(dbPath, "utf8");
    return JSON.parse(raw) as TenderLensDb;
  } catch {
    return {
      version: 1,
      updatedAt: new Date().toISOString(),
      tenders: [],
      dashboardSnapshots: []
    };
  }
}

export async function upsertTenderSnapshot({
  tenders,
  liveRows,
  source
}: {
  tenders: Tender[];
  liveRows: number;
  source: string;
}) {
  const db = await readLocalDb();
  const byId = new Map(db.tenders.map((tender) => [tender.id, tender]));
  for (const tender of tenders) byId.set(tender.id, tender);
  const pipelineCr = tenders.reduce((sum, tender) => sum + tender.valueCr, 0);
  const weightedPipelineCr = tenders.reduce((sum, tender) => sum + tender.valueCr * (tender.winProbability / 100), 0);

  const next: TenderLensDb = {
    ...db,
    updatedAt: new Date().toISOString(),
    tenders: [...byId.values()],
    dashboardSnapshots: [
      {
        id: `SNAP-${Date.now()}`,
        createdAt: new Date().toISOString(),
        tenderCount: tenders.length,
        liveRows,
        pipelineCr,
        weightedPipelineCr,
        source
      },
      ...db.dashboardSnapshots
    ].slice(0, 50)
  };

  await mkdir(path.dirname(dbPath), { recursive: true });
  await writeFile(dbPath, JSON.stringify(next, null, 2));
  return next;
}
