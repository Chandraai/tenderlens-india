# TenderLens India

Full-stack India tender analysis platform for CEOs, managers and analysts.

## Market assumptions

- India tender discovery is fragmented across GeM, CPPP/GePNIC, state portals and PSU/defence sources.
- GeM is a high-volume goods/services marketplace; CPPP remains central for ministries, CPSEs and autonomous bodies.
- MSME benefits, EMD/PBG cash exposure, L1/L2 price behavior, corrigenda and PDF eligibility clauses are critical operating details.

## Stack

- Next.js App Router, TypeScript, Tailwind CSS
- Recharts and D3 for analytics
- NextAuth role model for CEO, Manager and Analyst
- PostgreSQL schema through Prisma, Redis-ready caching
- FastAPI AI microservice with scikit-learn win prediction
- Docker Compose for web, AI, PostgreSQL and Redis
- UP eTender adapter for construction-related organisation counts and live PWD tender signal

## Run locally

```bash
npm install
npm run dev -- -p 4000
```

Open `http://localhost:4000`.

## Deployment Quick Start

This app is not static hosting-ready. It needs a Node.js runtime because it uses Next.js API routes, live portal fetches, PDF parsing and server-side download routes.

Use one of these:

- VPS with Docker Compose: recommended for production control.
- VPS with Node + PM2 + Nginx: also good.
- Vercel/Render/Railway: okay for demos, but live portal/PDF work can hit serverless limits.

## Environment

Copy the example file and set real values:

```bash
cp .env.example .env
```

Required production values:

- `NEXTAUTH_URL=https://your-domain.com`
- `NEXTAUTH_SECRET=<long random secret>`
- `DATABASE_URL=postgresql://...`
- `REDIS_URL=redis://...`
- `AI_SERVICE_URL=http://localhost:8000` or your AI service URL

Optional:

- `OPENAI_API_KEY`
- `GEM_API_KEY`
- `CPPP_FEED_TOKEN`

Generate a strong secret:

```bash
openssl rand -base64 32
```

## Docker Compose Production

```bash
docker compose up -d --build
```

The web app is exposed on `http://localhost:4000`.

Useful commands:

```bash
docker compose logs -f web
docker compose restart web
docker compose down
```

The compose file mounts `appdata` to `/app/data` so the local dashboard snapshot DB survives container restarts.

## VPS Without Docker

Install Node.js 20+, then:

```bash
npm ci
npm run deploy:check
PORT=4000 npm run start:4000
```

For PM2:

```bash
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

Nginx reverse proxy example:

```nginx
server {
  listen 80;
  server_name your-domain.com;

  location / {
    proxy_pass http://127.0.0.1:4000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Add HTTPS with Certbot after DNS points to the VPS.

## Pre-Deploy Check

Run this before shipping:

```bash
npm run deploy:check
```

It runs lint and production build.

## Production notes

- Use AWS Mumbai region (`ap-south-1`) for data residency and latency.
- Replace demo feeds with portal adapters that respect official terms, credentials, rate limits and captcha boundaries.
- The UP adapter reads official public eProcurement HTML and degrades gracefully if the portal changes session/captcha behavior.
- Wire GPT-4o summarization through a secure server action/API route using `OPENAI_API_KEY`.
- Train the win model on your own historical tenders, submitted prices, outcomes, L1/L2 data and department-specific patterns.
- Do not commit `.env` or production secrets.
- Set `NEXTAUTH_URL` to the public HTTPS domain before going live.
