# India Tender Analysis Platform - Project Context

Last updated: 2026-05-15

## Product Goal

Build a full-stack India Tender Analysis Platform for CEOs, investors, managers, and analysts. The app is focused on Indian real-estate, construction, civil works, PWD, CPWD, NHAI, housing, water infrastructure, and related tender opportunities.

Primary working URL:

- `http://localhost:4000`

Port `3000` is reserved for another project. Always run this app on port `4000`.

## Current Stack

- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- Recharts and D3
- Node.js API routes
- Python/FastAPI service exists under `services/ai`. PostgreSQL/Redis are represented in Docker/Prisma; current local persistence uses `data/tenderlens-db.json` as a DB-shaped development layer until Postgres is migrated live.
- PDF parsing uses `pdf-parse`.

## Key User Preference

The user prefers Hinglish/Hindi. Keep responses practical and direct. The user wants a complete running app, not only plans.

## Current Working Modules

- Dashboard
- CEO Advanced Cockpit
- Tender Feed
- AI Insights
- Competitor Intelligence
- Financial Analytics
- Document Vault
- Alert Center
- Settings

## Important Files

- `app/layout.tsx`
- `components/app-shell.tsx`
- `lib/data.ts`
- `lib/types.ts`
- `lib/tender-analysis.ts`
- `lib/company-doc-analysis.ts`
- `lib/ai-recommendation.ts`
- `lib/ceo-analytics.ts`
- `lib/local-db.ts`
- `lib/integrations/up-portal.ts`
- `lib/integrations/live-tenders.ts`
- `components/tender-table.tsx`
- `components/up-portal-sync.tsx`
- `components/uploaded-tender-insights.tsx`
- `components/pdf-upload-analyzer.tsx`
- `components/company-document-vault.tsx`
- `components/document-reporting-workspace.tsx`
- `components/ceo-advanced-dashboard.tsx`
- `app/ceo/page.tsx`
- `app/api/ceo-dashboard/route.ts`
- `app/api/tenders/route.ts`
- `app/api/tenders/analyze-pdf/route.ts`
- `app/api/tenders/analyze-source/route.ts`
- `app/api/company-documents/analyze/route.ts`
- `app/api/ai/recommendation/route.ts`
- `app/api/integrations/up-portal/route.ts`
- `app/api/integrations/sync/route.ts`
- `services/ai/main.py`
- `data/tenderlens-db.json`

## Current Data/Integration State

The app currently blends three kinds of tender data:

1. Curated construction/civil tender dataset in `lib/data.ts`.
2. UP eTender live construction signal through `lib/integrations/up-portal.ts`.
3. Public PDF construction tender parsing through `lib/integrations/live-tenders.ts`.

Latest verified UP eTender values:

- Construction organisations: `30`
- Official active construction tender count: `1,639`
- Live tender signal example: `2025_CEUCZ_1101428_2`

The app has a normalized live feed API:

- `GET /api/tenders`

It returns curated rows plus live rows. Some portals can require session/captcha/credentials, so restricted portal rows are represented with source URLs and manual verification notes.

The app now writes durable development snapshots to:

- `data/tenderlens-db.json`

CEO dashboard API:

- `GET /api/ceo-dashboard`

This API pulls the live tender feed, persists a DB snapshot, calls the Python/FastAPI ML service when available, and falls back to local predictions when the Python service is not running.

FastAPI ML endpoints:

- `/health`
- `/predict-win`
- `/dashboard-insights`
- `/summarize-pdf`

FastAPI local venv:

- `services/ai/.venv`

Run AI service:

```bash
services/ai/.venv/bin/uvicorn services.ai.main:app --host 127.0.0.1 --port 8000
```

Prisma schema has been expanded for Tender, TenderAnalysis, MlPrediction, DashboardSnapshot, and CompanyDocument.

## Tender Feed Features

Tender Feed now supports:

- Search and filters.
- Construction-only India tenders.
- Live normalized feed hydration from `/api/tenders`.
- UP data clarity badges:
  - `live source rows`
  - `UP rows loaded`
  - official UP active count when adapter response is available
  - note explaining official UP count vs row-level tender rows
  - `Show UP` / `Show all` quick filters
- Source labels:
  - `UP eTender Live`
  - `Public PDF`
  - `Curated`
- Row actions:
  - `View`: opens full tender detail modal.
  - `Download`: server-side source-aware download. Real PDF rows return PDF attachment; official portal rows return official source HTML; curated/no-source rows return clearly marked normalized brief.
  - `Analyze`: sends the tender directly to AI Insights and redirects to `/ai-insights`.

Analysis from feed uses:

- `POST /api/tenders/analyze-source`
- `POST /api/tenders/download`

PDF sources are parsed directly where possible. Non-PDF portal/curated rows are converted into a tender-like analysis text using tender metadata, clauses, PQ checks, financials, risk, and bid ranges.

## Document Vault Features

Document Vault supports:

- Tender PDF upload.
- PDF parsing.
- Deadline extraction.
- EMD/PBG extraction.
- PQ criteria extraction.
- Scope and key clause extraction.
- Risk and bid-readiness scoring.
- CEO/investor report saved to AI Insights.

Company document checklist is no longer only hardcoded demo UI. It supports document upload/classification logic for:

- GST
- PAN
- MSME/Udyam
- ISO
- Contractor registration
- ITR
- Net worth certificate
- Other compliance documents

It extracts expiry-like information where possible and flags gaps.

## AI Insights Features

AI Insights shows CEO/investor decision reports saved from:

- Uploaded tender PDFs.
- Tender Feed `Analyze` action.

Report actions/buttons include:

- CEO Summary
- Finance
- PQ Checklist
- Risks
- Bid Strategy
- 72h Plan
- AI Recommendation
- Approve Bid
- Need Clarification
- No-Bid
- Export CEO memo

The AI recommendation button calls:

- `POST /api/ai/recommendation`

## CEO Advanced Cockpit

Route:

- `/ceo`

Features:

- DB-backed KPI cards.
- Pipeline value and weighted revenue forecast.
- EMD blocked capital.
- State opportunity heatmap.
- Risk vs value matrix.
- Python ML bid ranking.
- Recommended price band.
- CEO action queue.
- Capital stack chart.
- Board narrative.
- DB/ML/source health panel.

## Verified PDF Tests

1. User PDF:

`/Users/onecp/Downloads/UP Model Building Bylaws 2025_3July_250704_125142.pdf`

Result:

- Correctly classified as `Reference/Bylaws`.
- `isTenderDocument: false`
- Decision: `Avoid / No-Bid`
- Value/EMD/PBG/deadline: Not applicable.

2. Public Indian construction tender PDF:

Source:

`https://cewacor.nic.in/Document/2026/March/Work_Documents/Applicant_Recno1/TenderDoc56T1_a7d6a946-ef09-46e2-8c19-6f46d7a27745.pdf`

Local fallback:

`/tmp/indian-construction-tender.pdf`

Extracted tender:

- Title: `Construction of Labour Toilet block with electrical and plumbing works along with construction of septic tank, soak pit at CW-GIDA.`
- Document type: `Tender`
- Value: approx `Rs. 13,23,865.91`
- Value in feed: approx `0.132 Cr`
- EMD: `Rs. 26,500`
- EMD in feed: `0.265 lakh`
- PBG: `5%`
- Deadline: `18.03.2026`
- Deadline status: `Closed`
- Decision: `Avoid / No-Bid`

## Common Commands

Use this to run the app:

```bash
rm -rf .next && npm run dev -- -p 4000
```

Build:

```bash
npm run build
```

Lint:

```bash
npm run lint
```

Smoke test pages:

```bash
for p in / /ceo /tenders /ai-insights /documents /competitors /financials /alerts /settings; do printf "%s " "$p"; curl -sS -o /tmp/page.html -w "%{http_code}\n" http://localhost:4000$p; done
```

API test:

```bash
curl -sS http://localhost:4000/api/tenders | node -e "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{const j=JSON.parse(s); console.log(JSON.stringify({total:j.tenders?.length,liveRows:j.liveRows,up:j.up,warnings:j.warnings},null,2))})"
```

## Current Verification Status

Last verified:

- `npm run build` passed.
- `npm run lint` passed.
- `python3 -m py_compile services/ai/main.py` passed.
- Pages returned `200`:
  - `/`
  - `/ceo`
  - `/tenders`
  - `/ai-insights`
  - `/documents`
  - `/competitors`
  - `/financials`
  - `/alerts`
  - `/settings`
- Browser-tested Tender Feed actions:
  - `View` modal opens.
  - `Download` button is visible and wired.
  - Real PDF download verified for `CWC-RO-LKO-56T-2026`: `application/pdf`, approx 3.8MB, attachment filename `cwc-ro-lko-56t-2026-tender-document.pdf`.
  - Curated/no-source row download verified as `normalized-brief`, not falsely labeled as real PDF.
  - `Analyze` sends tender to AI Insights.
  - AI Insights shows CEO/investor decision report.
- Browser-tested CEO Advanced Cockpit:
  - KPI cards load.
  - Python ML Bid Ranking section visible.
  - Verified `Model source: python-fastapi` when FastAPI service is running.
  - CEO Action Queue visible.
  - Board Narrative visible.
  - DB status visible.
- Financial Analytics page was upgraded to a responsive client dashboard:
  - KPI cards wrap cleanly.
  - KPI cards are now clickable buttons linked to related sections.
  - Bid Value vs Forecast chart fits viewport.
  - EMD/PBG blocked capital chart fits viewport.
  - Tender Finance Register is inside horizontal scroll.
  - CSV export is wired.
- Alert Center was upgraded:
  - KPI cards for critical, deadline, EMD risk, acknowledged.
  - Category filters.
  - Owner/action workflow.
  - Acknowledge toggle.
  - Open tenders action.
- Settings was upgraded:
  - Team roles with user/access summaries.
  - Portal integration health and configure buttons.
  - Notification channel toggles.
  - Report schedule toggles.
  - Security/audit readiness panel.
  - Save state feedback.

## Next Likely Work

Good next improvements:

- Replace local JSON DB with live PostgreSQL via Prisma migration.
- Add official portal credentials/API settings persistence.
- Add more state portal adapters.
- Add CPPP deeper search adapter.
- Add scheduled background sync jobs.
- Add real XLSX/PDF export reports for CEO/board.
- Add row-level tender PDF downloader where portal provides document links.
- Add production auth/role-based dashboards with NextAuth session enforcement.
- Add queue/retry/caching for portal fetches.
- Train FastAPI model on real historical award/L1 data instead of demo/fallback features.

## Important Caveat

Full live row-by-row ingestion from some Indian portals may need official API keys, session cookies, captcha-safe browser automation, or user-provided credentials. Keep the current approach graceful: use source links, normalized metadata, warnings, and manual verification where portals restrict access.

## 2026-06-05 GeM + UP Construction Update

Latest GeM integration state:

- `lib/integrations/gem-portal.ts` checks the official GeM public bid page at `https://bidplus.gem.gov.in/all-bids`.
- `/api/integrations/gem` returns GeM reachability, public-signal rows, session requirement, and warnings.
- `/api/tenders` now merges UP portal rows, public PDF tender rows, and GeM UP construction signal rows.
- GeM rows are explicitly marked with `portal: "GeM"`, `state: "Uttar Pradesh"`, and `sourceType: "GeM Public Signal"`.
- Tender Feed shows a `Show GeM UP` quick filter that applies Portal = GeM and State = Uttar Pradesh.
- Tender Feed header shows the count of GeM UP construction rows, plus a note explaining that official GeM deep row extraction needs session/API credentials.

Verification:

- `npm run lint` passed.
- `npm run build` passed.
- Page smoke test returned `200` for `/`, `/ceo`, `/tenders`, `/ai-insights`, `/documents`, `/competitors`, `/financials`, `/alerts`, and `/settings`.
- `/api/integrations/gem` returned `ok: true`, `publicRows: 3`, and `sessionRequired: true`.
- Browser-tested `/tenders`: `Show GeM UP` filter is visible and shows GeM Uttar Pradesh construction rows.

Caveat:

- GeM is reachable, but full real row-by-row ingestion should not be claimed until GeM API credentials/session-safe access are configured. Current app uses verified public-source connectivity plus clearly labeled GeM public-signal tender rows.

## 2026-06-05 Demo Readiness QA Pass

Latest demo fixes:

- Tender Feed no longer forces users to left-right scroll on small and medium screens. It now renders tender cards with `View`, `Download`, and `Analyze` actions below `xl`, and keeps the full table for wide desktop.
- Financial Analytics register no longer forces small-screen horizontal scrolling. It now renders CEO-ready finance cards below `xl`, and keeps the full register table on wide desktop.
- Settings connector labels now match the real integration state:
  - GeM is `GeM public checker`, not falsely shown as a fully connected API key.
  - GeM message says official public bid page is reachable, but API/session credentials are needed for full row ingestion.
  - UP portal adapter still runs the live official UP eTender check.

Verification:

- `npm run lint` passed.
- `npm run build` passed.
- Dev server restarted on `http://localhost:4000`.
- Route smoke test returned `200` for `/`, `/ceo`, `/tenders`, `/ai-insights`, `/documents`, `/competitors`, `/financials`, `/alerts`, and `/settings`.
- Connector smoke test:
  - `/api/tenders`: `total: 14`, `liveRows: 4`, UP `activeConstructionTenderCount: 1774`, GeM `publicRows: 3`.
  - `/api/integrations/gem`: `ok: true`, source `https://bidplus.gem.gov.in/all-bids`, `sessionRequired: true`.
  - `/api/integrations/up-portal`: `ok: true`, `activeConstructionOrgCount: 30`, `activeConstructionTenderCount: 1774`, `appMatchedTenders: 5`.
- Browser QA at small viewport showed `overflow: false` for `/`, `/ceo`, `/tenders`, `/ai-insights`, `/documents`, `/competitors`, `/financials`, `/alerts`, and `/settings`.
- Browser confirmed `/tenders` card layout visible with no table on small viewport, and `/financials` finance cards visible with no table on small viewport.

## 2026-06-05 GeM Public JSON Upgrade

Latest GeM production-step upgrade:

- `lib/integrations/gem-portal.ts` now performs a real public GeM CSRF/session handshake:
  - opens `https://bidplus.gem.gov.in/all-bids`
  - extracts `csrf_gem_cookie`
  - POSTs to `https://bidplus.gem.gov.in/all-bids-data`
  - searches current ongoing bids for construction/road/building/civil/PWD Uttar Pradesh queries
  - filters to UP buyer/location signals and construction/infra categories
- GeM rows are now marked `sourceType: "GeM Live"` when they come from the real public JSON endpoint.
- Fallback `GeM Public Signal` remains only for endpoint failure/no-match cases.
- `/api/tenders` now returns GeM metadata including `mode`, `totalMatched`, `sessionRequired`, and `credentialsRequired`.
- Tender Feed copy now says GeM all-bids JSON is reachable via public CSRF/session handshake, with value/EMD/BOQ still requiring GeM document verification.
- Settings connector now shows `GeM live public adapter`, not a fake API-key-connected state.
- `app/api/tenders/download/route.ts` now sniffs downloaded source bytes. GeM `showbidDocument` URLs return real PDF bytes even without `.pdf` in the URL, so the app now serves them as `application/pdf` with `x-tenderlens-download-source: real-pdf`.
- Tender Feed labels GeM Live download buttons as `PDF`.

Verification:

- `/api/integrations/gem` returned `mode: "public-json"`, `publicRows: 5`, `totalMatched: 5`, `sessionRequired: false`, `credentialsRequired: false`.
- `/api/tenders` returned `total: 16`, `liveRows: 6`, GeM `mode: "public-json"`, GeM `publicRows: 5`.
- GeM Live rows included examples such as `GEM/2026/B/7565879` from `Energy Department Uttar Pradesh` and street-light infra bids from `Urban Development Department Uttar Pradesh`.
- GeM download route verified a live GeM source URL as `content-type: application/pdf`, filename `gem-2026-b-7565879-tender-document.pdf`, and `%PDF-` magic bytes.
- Browser verified `Show GeM UP` displays `GeM Live` rows, real GeM bid IDs, `PDF` download buttons, and `Analyze` buttons.
- `npm run lint` passed.
- `npm run build` passed.
- Dev server was clean restarted on `http://localhost:4000` after build to avoid stale `.next` hot-reload chunks.

## 2026-06-05 Tender Action Detail Fix

Issue fixed:

- Live GeM tender rows had real PDF document URLs like `https://bidplus.gem.gov.in/showbidDocument/...`, but those URLs do not end with `.pdf`.
- `Analyze` and `View` were previously treating those rows as normalized feed rows, so CEO-facing details showed too many `Verify` / `Not clearly found` fields.

Latest behavior:

- `app/api/tenders/analyze-source/route.ts` now downloads source URLs and detects PDFs by `content-type` or `%PDF-` bytes, not only by `.pdf` URL extension.
- GeM Live documents now parse the actual PDF before AI Insights/report generation.
- `lib/tender-analysis.ts` now extracts GeM-style bare numeric values such as `Estimated Bid Value 4633081.2` and formats them as Indian money, for example `Rs. 46.33 lakh`.
- Tender `View` modal now auto-extracts source document details and shows an `Extracted From Source Document` panel with:
  - Value
  - EMD
  - PBG
  - Deadline
  - Scope
  - PQ / Eligibility
  - Key clauses

Verification:

- GeM row `GEM/2026/B/7565879` analysis now returns `source: "source-document"`, value `Rs. 46.33 lakh`, EMD `Rs. 78000.00`, deadline `2026-06-05`, and source-derived scope/PQ clauses.
- Browser verified the first GeM row `View` modal shows `Extracted From Source Document`, `Rs. 46.33 lakh`, `Rs. 78000.00`, structural steel scope, turnover PQ, and key clauses.
- `npm run lint` passed.
- `npm run build` passed.

## 2026-06-05 Closed Tender CEO Guardrail

Latest CEO/no-bid guardrail:

- Closed tenders now show a red CEO decision banner inside Tender Feed `View` modal:
  - `CEO decision: No-Bid for current cycle`
  - stop EMD/pricing/BOQ/bid-prep spend
  - only track official corrigendum/reopen
  - archive as closed and move team effort to open tenders
- AI Insights uploaded/source report cards now show a closed-deadline no-bid warning.
- CEO Cockpit `recommendDecision` now hard-returns `No-Bid` when `tender.status === "Closed"`.

Verification:

- For UP tender `2025_CEUCZ_1101428_2`, browser verified modal shows the no-bid banner, `Do not spend on EMD`, archive/corrigendum watch action, extracted value `Rs. 0.219 Cr`, EMD `Rs. 2.190 lakh`, and deadline `2026-01-01`.
- `npm run lint` passed.
- `npm run build` passed.

## 2026-06-05 Probability/Risk/PBG Basis Transparency

Latest explainability fix:

- Tender Feed `View` modal now includes `Scoring / Finance Basis`.
- The section explains:
  - probability basis: AI score, PQ readiness, risk, margin, deadline status and source completeness; for closed tenders it clarifies this is only historical/fit score and CEO decision remains No-Bid
  - risk basis: source clauses if extracted, otherwise normalized feed signals, missing PQ gates, EMD/PBG completeness, deadline and NIT/BOQ parsing status
  - PBG basis: whether source extracted it, normalized/default dashboard assumption, or not found/needs portal verification
  - PBG exposure estimate when value and PBG percent are available
  - final rule: source-extracted values override model defaults, and any `Verify` field needs official portal check before CEO approval

Verification:

- Browser verified Tender Feed `View` modal shows `Scoring / Finance Basis`, `Probability basis`, `Risk basis`, `PBG basis`, and final source-overrides-model rule.
- `npm run lint` passed.
- `npm run build` passed.

## 2026-06-05 Expired Tender Default Hide

Latest feed discipline fix:

- `/api/tenders` now excludes closed/expired tenders from the default `tenders` array.
- Closed/expired rows are returned separately as `closedTenders` with `closedRows` count, so they can still be audited intentionally.
- Tender Feed now shows a `closed hidden` badge and a `Show closed` / `Hide closed` toggle.
- UP adapter widget no longer displays expired live signals as active. If a portal signal has already passed its bid submission deadline, the widget shows a hidden-signal note instead of the tender title.

Verification:

- `/api/tenders` returned `closedInDefault: 0` and moved expired rows such as `2025_CEUCZ_1101428_2` into `closedTenders`.
- Browser verified default `/tenders` page no longer shows `Ballu Adda`, while `closed hidden`, `Show closed`, and the expired UP signal note are visible.
- `npm run lint` passed.
- `npm run build` passed.
