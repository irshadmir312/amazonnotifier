# Amazon Jobs Monitor — Worklog

## Project Overview
**Two-part system**: (1) Chrome extension v2 with BIP BIP alerts, (2) **NEW: Full-stack web app** for server-side job monitoring with AI-powered filtering and email notifications. Deployable on Vercel.

---

## v3.0 — Server-Side Web Monitor (NEW)

### What Changed
Complete pivot from browser-only to **server-side monitoring**. User subscribes with email, the server scans Amazon UK jobs every 5 minutes, AI filters for hourly/no-CV jobs, and emails the user instantly.

### Architecture
```
User → Subscribes via email on landing page
         ↓
Vercel Cron → /api/scan (every 5 min)
         ↓
    Scraper (4 strategies)
    1. z-ai-web-dev-sdk page_reader (dev)
    2. Amazon jobs API endpoints
    3. HTML + cheerio parsing
    4. Alternative API patterns
         ↓
    AI Filter (OpenAI/DeepSeek or z-ai-sdk fallback)
    - Classifies: hourly? no CV? UK?
    - Keyword fallback if AI unavailable
         ↓
    Email Notifications (Resend)
    - Beautiful HTML emails with job cards
    - Direct "Apply Now" links
    - Digest generation via AI
         ↓
    Database (Prisma/SQLite → Vercel Postgres for prod)
    - DetectedJob, Subscription, ScanLog, NotificationLog, AppSettings
```

### New Files Created

| File | Purpose |
|------|---------|
| `src/lib/scrape.ts` | Multi-strategy job scraper (SDK + API + HTML) |
| `src/lib/ai-filter.ts` | AI job analysis (OpenAI/DeepSeek/SDK fallback) |
| `src/lib/email.ts` | Resend email notifications with HTML templates |
| `src/app/api/subscribe/route.ts` | Email subscription (POST/DELETE/GET) |
| `src/app/api/jobs/route.ts` | Job listing with pagination (GET/DELETE) |
| `src/app/api/scan/route.ts` | Job scan trigger (POST) — full pipeline |
| `src/app/api/stats/route.ts` | Dashboard statistics (GET) |
| `vercel.json` | Cron config (every 5 min) + security headers |
| `.env.example` | Environment variable documentation |

### Updated Files

| File | Changes |
|------|---------|
| `prisma/schema.prisma` | New models: Subscription, DetectedJob, ScanLog, NotificationLog, AppSettings |
| `src/app/page.tsx` | Complete rewrite — stunning landing page with all sections |
| `src/app/layout.tsx` | Updated metadata for SEO |
| `.env` | Added AI and email config placeholders |
| `package.json` | Added openai, resend, cheerio |

### Landing Page Sections (9 sections, single route `/`)
1. Sticky navigation with mobile hamburger menu
2. Hero with email subscription form + animated gradient orbs
3. How It Works — 3-step process with connecting line
4. Features Grid — 6 cards (AI filtering, 5-min scan, email alerts, etc.)
5. Live Stats — Dark navy section, fetches from /api/stats
6. Recent Jobs — Shows detected relevant jobs
7. FAQ — 6 questions with shadcn Accordion
8. CTA — Orange gradient with second subscription form
9. Sticky footer

### API Endpoints Tested
- `POST /api/subscribe` — ✅ Creates subscription, sends confirmation email
- `POST /api/subscribe` (duplicate) — ✅ Returns "already subscribed"
- `POST /api/subscribe` (invalid email) — ✅ Returns validation error
- `POST /api/scan` — ✅ Runs full scrape → AI filter → save → notify pipeline
- `GET /api/stats` — ✅ Returns subscribers, jobs, scans, notifications, config
- `GET /api/jobs` — ✅ Paginated job listing
- `GET /api/jobs?relevant=true` — ✅ Filtered to relevant only
- `GET /` — ✅ 200, all 8 sections render

### AI Integration
- **Primary**: OpenAI SDK (configurable base URL for DeepSeek, etc.)
- **Fallback**: z-ai-web-dev-sdk LLM (works in dev sandbox)
- **Last resort**: Keyword-based classification
- Filters for: hourly, no CV required, UK-based, warehouse/fulfillment

### Email System (Resend)
- Confirmation email on subscription
- New job alert with orange-themed HTML template
- AI-generated digest for job summaries
- Professional email wrapping with Amazon Jobs Monitor branding

### Deployment Notes
- **Vercel Cron**: Configured in vercel.json for every 5 minutes
- **Database**: SQLite for local dev; Vercel Postgres/Turso for production
- **Environment**: .env.example documents all required keys
- **Chrome extension**: Still in chrome-extension/ folder (unchanged)

### Verification
- `bun run lint` — ✅ 0 errors
- Page renders — ✅ All 9 sections present (60KB HTML)
- Subscribe API — ✅ Creates, deduplicates, validates
- Scan API — ✅ Full pipeline runs (scraper → AI → DB → email)
- Stats API — ✅ Returns live data
- SDK integration — ✅ page_reader fetches Amazon page (6585 chars HTML)

### Risks & Notes
- Amazon jobs page is SPA — static scraping gets shell only. On Vercel, API endpoint strategies will work better
- For production: may need headless browser (Browserless/Playwright) for full SPA rendering
- Email requires Resend API key (free tier: 3,000/month)
- AI requires OpenAI or DeepSeek API key (or z-ai-sdk in dev)

---

## v2.0 — Chrome Extension (Previous)

### Features
- Loud multi-beep BIP BIP alarm sound system
- Shift/schedule page monitoring
- Tab title flashing, persistent badge, repeat alerts
- Popup v2 with tabs, toggles, keyword filtering
- Page overlay on Amazon pages
- Full settings panel

### Files (10 files in chrome-extension/)
- manifest.json, background.js, content.js, overlay.css
- popup.html, popup.css, popup.js
- icons/icon{16,48,128}.png

---

## Unresolved / Next Phase
1. **Vercel deployment**: User needs to add real API keys and switch DB to Vercel Postgres
2. **SPA scraping**: May need Browserless/Playwright service for full Amazon SPA rendering
3. **Email domain**: Resend default domain (onboarding@resend.dev) — should add custom domain
4. **Rate limiting**: No API rate limiting yet (add for production)
5. **Unsubscribe page**: Need a dedicated unsubscribe URL route
6. **Mobile push notifications**: Consider adding PWA + push notifications
7. **Job source config**: Allow users to configure additional job search URLs/keywords