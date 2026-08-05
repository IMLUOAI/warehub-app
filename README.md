# WAREHUB
### Warehouse Management Platform

> Multi-tenant browser app for warehouse and 3PL operations. No installation required.
> Frontend is static HTML/CSS/JS (`index.html`, `landing.html`, `billing.html`) hosted on GitHub Pages;
> backend is a Cloudflare Worker + D1 database + KV for sync, auth via Clerk, billing via Stripe.

---

## 🚀 Live URLs

| Site | URL | Purpose |
|------|-----|---------|
| Marketing site | [https://wareplatform.com](https://wareplatform.com) | Public landing page — features, pricing, testimonials |
| App | [https://app.wareplatform.com](https://app.wareplatform.com) | The actual warehouse management app (auth + subscription required) |
| Billing | [https://app.wareplatform.com/billing.html](https://app.wareplatform.com/billing.html) | Plan selection + Stripe checkout |
| API | `https://api.wareplatform.com` | Cloudflare Worker — auth-protected data + AI proxy |

---

## 🔐 Auth & Billing

- **Auth:** [Clerk](https://clerk.com) — sign-in overlay shown before the app loads (`#clerk-auth-screen`).
  ⚠️ Currently running on a **development instance** (`golden-magpie-54.clerk.accounts.dev`, `pk_test_...` key). Upgrade to a production Clerk instance before onboarding real customers — dev instances have lower rate limits and an unbranded auth domain.
- **Billing:** Stripe Checkout, gated behind a subscription wall (`#billing-gate`) shown to any authenticated user without an active plan. Plans are chosen on `billing.html`, which calls `POST /api/billing/checkout` on the Worker.
- **Trial terms (as shown in-app):** 14-day free trial, no credit card required, cancel anytime. Confirm this is actually configured that way in the Stripe dashboard, since it's a claim shown directly to customers.

⚠️ **Known pricing mismatch:** `billing.html` currently charges **Starter $79/mo · Pro $149/mo**, but the marketing site (`landing.html` / wareplatform.com) advertises **Starter $29/mo · Pro $79/mo · Enterprise custom**. These need to match before driving signups — a prospect who reads one price and is charged another is a fast way to lose trust (and generate chargebacks).

---

## 📋 Tabs Overview (in-app)

| Tab | Purpose |
|-----|---------|
| **Import** | Drag & drop PDF from Lingxing OMP. Auto-detects carrier, tracking, SKU, shelf location. Shows `X/N labels parsed` with warning if any pages were skipped. |
| **Packers** | Add/remove staff. Auto-syncs via Worker API (D1). Print CR80 ID cards. Auto-assign orders. Print pick lists. |
| **Pack Station** | Scan gun workflow — scan packer barcode to clock in/out. Single-item orders complete in 1 scan. Multi-item orders require SKU verification. Supports simultaneous multi-packer operation with per-packer order attribution. |
| **Dashboard** | Live KPIs, shift progress, packer leaderboard, carrier breakdown, orders table. |
| **📊 Stats** | Productivity chart — packages/speed per packer, active status, timesheet, clock-in log. Optional Excel snapshot export. |
| **Floor Display** | Minimal big-screen view for warehouse TV — remaining orders and active packers. |
| **📦 Returns** | Scan return packages. Log carrier, type, condition, SKU, restock location, pile assignment, photos. Manager alert on damaged/counterfeit items. |
| **🚗 Vehicle** | Trip log — driver, license plate, Google Maps destination, odometer, departure/return time, notes. |
| **🗺 Rack Map** | Interactive SVG warehouse layout, configurable zones. Click cells to see contents. Scan gun LOCATE/ASSIGN modes. Inventory CSV import. |
| **📤 FBA Outbound** | End-of-day manager form — FBA Shipment ID, FC destination, carrier + tracking to FC, boxes, units, box dims, weight per box, dynamic SKU rows. CSV export + reprint queue. |

An internal "Dev Panel" tab (service config reference, API keys, changelog) previously existed but has been **removed from the shipped app** — it was static HTML shipped to every visitor regardless of login state, which exposed internal config publicly. Keep that kind of reference material in a private doc instead of in `index.html`.

---

## 🔧 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML/CSS/JS — single `index.html`, no framework |
| Layout | CSS Grid (body) + `position:absolute` views, visibility toggle via `gv()` |
| Auth | Clerk (`@clerk/clerk-js`) |
| Billing | Stripe Checkout via Worker-proxied endpoints |
| Backend | Cloudflare Worker (`warehub-worker`) |
| Database | Cloudflare D1 (`warehub-db`) — primary store for orders, returns, vehicle trips, FBA shipments, settings, insights |
| Sync strategy | Dual-write: every write goes to `localStorage` first (instant, offline-safe), then to the Worker API (async); reads try the API first and fall back to `localStorage` silently |
| Legacy sync | Cloudflare KV (`WAREHUB_KV`) — still used for some staff sync paths |
| PDF Parsing | pdf.js 3.11.174 — lazy loaded on first PDF drop |
| Excel Export | SheetJS (xlsx) — lazy loaded on Excel connect |
| Excel Auth | Microsoft Graph API via MSAL.js — lazy loaded on Excel connect |
| Maps | Google Maps JS API + Places API (`loading=async`), key restricted to `app.wareplatform.com` |
| AI Assistant | Anthropic Claude (`claude-sonnet-5`) via Worker proxy at `/api/ai` |
| AI Insights (nightly) | Anthropic Claude (`claude-haiku-4-5`) via `/api/insights` |
| Deployment | GitHub Pages — auto-deploy on push to `main` |

---

## 🔗 Connected Services

### GitHub Pages (Frontend)
- **Repo:** `https://github.com/imluoai/warehub-app`
- **Live (custom domain):** `https://app.wareplatform.com/`
- **Deploy:** `git add . && git commit -m "msg" && git push`
- Pages deploys in ~1 min. Hard refresh: `Ctrl+Shift+R` / `Cmd+Shift+R`
- **CNAME record:** `app.wareplatform.com → imluoai.github.io`

### Cloudflare Worker (API)
- **Dashboard:** dash.cloudflare.com
- **Worker name:** `warehub-worker`
- **Custom domain:** `https://api.wareplatform.com`
- **Key endpoints:** `/api/ai` (AI proxy) · `/api/orders` · `/api/returns` · `/api/vehicle/trips` · `/api/fba` · `/api/settings` · `/api/events` · `/api/insights` · `/api/packers` · `/api/packers/sync` · `/api/tenants/register` · `/api/billing/checkout` · `/api/billing/webhook` · `/api/billing/status`
- **Secrets:** `ANTHROPIC_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `CLERK_SECRET_KEY` (Worker-side only — never in the browser)
- **D1 binding:** `DB` → `warehub-db`
- **KV binding:** `WAREHUB_KV`
- **⚠ Cloudflare Access must be DISABLED** on this Worker route (breaks CORS otherwise)
- **CORS:** `Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS` required on every response, including OPTIONS preflight

### Clerk (Auth)
- **Dashboard:** dashboard.clerk.com
- **Status:** Development instance — upgrade to production before scaling
- **Secret:** `CLERK_SECRET_KEY` (Worker only)

### Stripe (Billing)
- **Dashboard:** dashboard.stripe.com
- **Secrets:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- **Webhook:** `api.wareplatform.com/api/billing/webhook`
- Confirm live mode (not test mode) before accepting real customer payments.

### Google Maps
- **Console:** console.cloud.google.com
- **Enabled APIs:** Maps JavaScript API · Places API · Maps Embed API
- **Restriction:** HTTP referrer restricted to `https://app.wareplatform.com` — key value intentionally not documented here; rotate via Google Cloud Console if it's ever suspected of leaking, referrer restriction is what actually protects it.

### Anthropic Claude AI
- **Console:** console.anthropic.com
- **Models:** `claude-sonnet-5` (in-app assistant) · `claude-haiku-4-5` (nightly insights)
- **API Key:** Stored as `ANTHROPIC_KEY` in Cloudflare Worker only

### Microsoft Azure (Excel Online) — optional per-tenant integration
- **Portal:** portal.azure.com
- **Required permissions:** `Files.ReadWrite` · `Sites.ReadWrite.All` · `User.Read`
- **Excel sheets written:** `Productivity` · `Returns Log` · `Vehicle Log`
- **Token expiry:** ~1 hour — reconnect via Stats tab → ⊞ CONNECT EXCEL

### FedEx (Shipping Status Tracking) — optional, per-tenant
- **Developer portal:** developer.fedex.com
- Uses FedEx Track API v1, called directly from the browser. Use production (not sandbox) credentials — sandbox blocks CORS.

### Lingxing ERP / OMP
- **URL:** omp.xlms.com/wms/outbound/parcel
- **Integration:** Export labels as PDF → drag into Import tab

---

## 📦 Supported Carriers

| Carrier | Tracking Pattern |
|---------|----------------|
| GOFO | `GFUS...` |
| UPS | `1Z...` (14–18 chars) |
| FedEx | `96...` / `61...` / `72/74/75...` — GS1-128 multi-piece barcodes supported |
| USPS | `92–98...` / Certified `70...` / 20–22 digit |
| SpeedX | `SPX...` / `SDX...` |
| SWIFT | `SWF...` / `SW+digits` |
| Uniuni | `UUS...` |
| LSO | `LSO...` / `1L...` |
| OnTrac | `C/D + 14 digits` |
| Amazon | `TBA...` / `1DS...` |
| DHL | `GM...` / `JD...` / 10–11 digits |

---

## 🖨 Label Printing

| Button | What it does |
|--------|-------------|
| **🖨 PRINT BY SKU GROUP** | Sorts all labels by SKU, prints each group together. Each order prints exactly once (deduped by tracking number). Sorted by shelf location within each group. |
| **🖨 PRINT BY PACKER** | Prints a full 4"×6" color-coded divider page per packer (name + label count), followed by their label stack sorted by shelf location. Unassigned orders grouped at the end. |

Both use `@page { size: 4in 6in; margin: 0 }` for direct thermal printer output.

---

## 👥 Multi-Packer Workflow

1. Import PDF batch → labels loaded into queue
2. **Packers tab → Auto-Assign** distributes orders evenly across active packers
3. **🖨 PRINT BY PACKER** → one stack per packer with a named divider cover page
4. Manager hands each packer their physical label stack
5. Each packer logs in at Pack Station with their ID barcode
6. Scan completions are credited to `order.assignedTo` — correct packer always gets credit
7. **Stats tab** shows all on-shift packers with orders completed, avg pack speed, and active status

---

## 📦 Pack Station — Scan Flow

| Order type | Scan flow |
|---|---|
| Single item | Scan shipping label → ✅ done (1 scan) |
| Multi-item | Scan shipping label → scan each SKU barcode → ✅ done |
| Multi-packer | Each packer logs in with their own ID card → orders attributed by `assignedTo` |

---

## 📦 Returns — Fields Captured

Tracking · Carrier · Return Type · Item Condition · SKU · Qty · Return Pile · Restock Location · Notes · Photos · Scanned By · Manager Review flag

**Return Piles:** A = Resellable · B = Needs Inspection · C = Damaged/Dispose · D = Manager Review

**Conditions triggering manager alert:** Opened Damaged · Item Damaged · Items Missing · Suspected Counterfeit

---

## 💾 Data Persistence

Dual-write model: every write lands in `localStorage` immediately, then syncs to the Worker/D1 asynchronously. Reads try the API first and fall back to `localStorage` if the Worker is unreachable, so the app stays usable offline.

| Data | Primary store | Cross-device |
|------|---------|--------------|
| Orders, Returns, Vehicle trips, FBA shipments, Settings, Insights | Cloudflare D1 via Worker API | ✅ |
| Packers & managers | D1 API (+ legacy KV path) | ✅ |
| Everything above, offline | localStorage | ❌ per browser until next sync |

---

## 🐛 Common Issues & Fixes

| Problem | Fix |
|---------|-----|
| Staff/data not syncing | ☁ icon red → check Worker deployed, D1/KV bindings set, Cloudflare Access disabled |
| ☁ turns red | Click the ☁ icon → runs a live connectivity test with the exact error message |
| AI not responding | 🤖 → ⚙ SETUP → verify Worker URL and that `ANTHROPIC_KEY` secret is set |
| Excel 401 error | Token expired — Stats tab → ⊞ CONNECT EXCEL → sign in again |
| Google Maps blank | Enable all 3 Maps APIs in Google Cloud Console; check key's referrer restriction includes `app.wareplatform.com` |
| PDF not parsing | Re-export from OMP · check Debug Log in Import tab |
| Batch count mismatch | Status bar shows `X/N labels parsed` — scroll Debug Log for skipped pages |
| Print buttons do nothing | Allow popups for `app.wareplatform.com` in the browser |
| App shows old version | `Ctrl+Shift+R` (PC) / `Cmd+Shift+R` (Mac) |
| FedEx status check fails | Use production FedEx credentials, not sandbox — sandbox blocks browser CORS |
| Billing/checkout errors | Confirm Stripe is in live mode and webhook secret matches the live endpoint |

---

## 📝 Changelog

### August 2026
- **security:** Removed the internal Dev Panel (service config, API key references, changelog) from the shipped app — it was static HTML served to every visitor regardless of auth state
- **security:** Rotated Google Maps API key after review
- **content:** Replaced placeholder landing page testimonials with real quotes from actual users and clients

### April 2026 — v2.5
- **feat:** Domain migration → wareplatform.com (app / api / landing page)
- **feat:** Landing page deployed on Cloudflare Pages — hero, features, pricing, testimonials
- **feat:** User menu in header — avatar, name/email, Billing link, sign out (Clerk)
- **feat:** FBA Reprint Queue — persistent panel for missing FBA box labels
- **feat:** Missing-labels panel with per-label reprint buttons
- **fix:** FedEx shared batch barcode — 3-tier fallback prevents duplicate tracking
- **fix:** GOFO / USPS / SWIFT parse fallbacks
- **fix:** Missing label count accuracy
- **fix:** OneDrive config scoped per Clerk user ID — prevents cross-tenant leak on shared browsers
- **remove:** PIN lock screen (redundant — Clerk handles auth)
- **remove:** FM radio / music player

### March 2026 — v2.0–v2.4
- Amazon FBA Outbound tab, Print by Packer, Vehicle tracking module, Returns intake with photos, Rack Map SVG, AI assistant (Claude), full carrier parsing overhaul (11 carriers), Dev Panel rewrite (later removed — see above)

### Feb 2026 — v1.x
- Initial build: Import → Packers → Pack Station → Dashboard → Stats → Floor Display. Cloudflare KV staff sync. MSAL Excel integration. GS1-128 barcode support.

---

## 📁 File Structure

```
warehub-app/
├── index.html            ← Main app (single file)
├── landing.html          ← Public marketing site (wareplatform.com)
├── billing.html          ← Plan selection + Stripe checkout
├── marketing-copy.md     ← Product Hunt / AppSumo / outreach copy drafts
├── SHIPPING_LABEL_RULES.md ← Internal label-parsing design notes
├── src/utils/labelSorter.js
├── logo.svg / logo-dark.svg
├── CNAME
└── README.md             ← This file
```

---

## 🏢 Company

**Double Sided ISCM LLC**
1701 10th St Suite 200, Plano, TX 75074

---

*Built with Claude*
