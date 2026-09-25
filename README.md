
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

**Plans** (kept in sync across `billing.html`, `landing.html`, and the Worker's `STRIPE_PRICES` map in `src/index.js`):

| Plan | Price | Stripe Price ID (name only — value lives in Worker secrets/code, not here) |
|------|-------|------|
| Basic | $29/mo | `STRIPE_PRICES.basic` |
| Starter | $79/mo | `STRIPE_PRICES.starter` |
| Pro | $149/mo | `STRIPE_PRICES.pro` |

If these three ever get out of sync between the marketing site, `billing.html`, and the Worker, checkout will silently charge a different amount than what's advertised — worth a quick cross-check any time pricing changes.

---

## 📋 Tabs Overview (in-app)

| Tab | Purpose |
|-----|---------|
| **Import** | Drag & drop PDF from Lingxing OMP. Auto-detects carrier, tracking, SKU, shelf location across 11 carriers using a multi-tier extraction chain (see **Tracking Number Extraction** below), with a targeted OCR fallback for labels whose tracking number is a flattened image rather than real text. Shows `X/N labels parsed`; any page that still can't be identified lands in the **Missing Labels** panel (sorted by SKU, so identical items group together) with its rendered image, ready to print and handle manually — nothing is ever silently dropped. |
| **Packers** | Add/remove staff. Auto-syncs via Worker API (D1). Print CR80 ID cards. Auto-assign orders. Print pick lists. |
| **Pack Station** | Scan gun workflow — scan packer barcode to clock in/out. Single-item orders complete in 1 scan. Multi-item orders require SKU verification. Supports simultaneous multi-packer operation with per-packer order attribution. As soon as a label scans (or an already-completed order is re-scanned), a large SKU + real shelf-location callout appears so packers can see at a glance what to grab and where, without squinting at small text. |
| **Dashboard** | Live KPIs, shift progress, packer leaderboard, carrier breakdown, orders table. |
| **📊 Stats** | Productivity chart — packages/speed per packer, active status, timesheet, clock-in log. Optional Excel snapshot export. Visible to owner/managers; not intended to feel like packer surveillance. |
| **Floor Display** | Big-screen view for a wall-mounted monitor — live rack map with large, distance-legible text, a **🎯 Pick Queue** panel cross-referencing every pending order's SKUs against real tracked inventory locations (grouped by location, not staging shelf), and a recent-completions ticker. |
| **📦 Returns** | Scan return packages. Log carrier, type, condition, SKU, restock location, pile assignment, photos. Manager alert on damaged/counterfeit items. Every logged entry is editable in place afterward, with inventory correctly reconciled (old contribution removed, new one applied) rather than just changing the display. Restocking a SKU to a location actually adds it to tracked inventory. |
| **📥 Receiving** | Dedicated tab for logging brand-new incoming stock — separate from Returns (which restocks previously-sold items). Fast SKU → Location → Quantity scanning built for many boxes in a row, with a persisted log (survives refresh), today/total stats, and Excel export. Assigns real shelf locations and deducts nothing (this is stock coming *in*). |
| **🚗 Vehicle** | Trip log — driver, license plate, Google Maps destination, odometer, departure/return time, notes. |
| **🗺 Rack Map** | Interactive SVG warehouse layout with configurable zones. Each zone can be laid out via drag (move/resize, now with a maximum-size cap so a zone can't be dragged into swallowing the whole canvas, 20px snap-to-grid with a visible grid overlay in edit mode, and a ↺ reset-to-natural-size button) or via exact numeric X/Y/Width/Height fields in Configure Layout for precise, repeatable control. Spot text size scales per zone so sparse zones get much larger text than dense ones. Each zone shows a large vertical warehouse-sign-style side label. Click a spot to see its contents; SKU search highlights every matching location. **📥 RECEIVE STOCK** links to the Receiving tab. Duplicate zone prefixes are blocked at save time (this used to silently generate colliding spot IDs). Location labels print in landscape with a real barcode. |
| **📤 FBA Outbound** | End-of-day manager form — FBA Shipment ID, FC destination, carrier + tracking to FC, boxes, units, box dims, weight per box, dynamic per-SKU rows. Submitting a shipment deducts each SKU's quantity from tracked inventory; editing reconciles old vs. new correctly; deleting restores what was deducted. CSV export + reprint queue. |

An internal "Dev Panel" tab (service config reference, API keys, changelog) previously existed but has been **removed from the shipped app** — it was static HTML shipped to every visitor regardless of login state, which exposed internal config publicly. Keep that kind of reference material in a private doc instead of in `index.html`.

---

## 🎯 Tracking Number Extraction — how it actually works

This is the most intricate, hard-won part of the codebase, rebuilt several times against real label data after earlier approaches turned out to be wrong in non-obvious ways. Worth understanding before touching it again.

**The chain, in order, per label page during import:**
1. **Direct text-pattern matching** (`matchTracking()`) — carrier-specific patterns against the PDF's actual text layer: UPS `1Z...`, GOFO `GFUS...`, SpeedX `SPX.../SDX...`, USPS `9-prefix + 20–22 digits`, Uniuni's real `YWE` + 14-digit format (confirmed against real batch data — not every Uniuni-style label is a synthetic ID), and an explicit `TRK#`-adjacent 12-digit match for FedEx.
2. **FedEx barcode-row, position-based** — FedEx labels print a barcode row like `9632 0804 0 (000 000 0000) 0 00 8776 2012 6920`. The leading ~22 digits are a **static account/facility prefix shared by every label from that account** — confirmed directly: many genuinely different real packages were all extracting to the identical fake "tracking number" because an earlier version matched that shared prefix instead of the real one. The real, unique number is always the **last 12 digits** of the row, regardless of what the leading digits happen to be (they vary by region — don't match by prefix pattern, ever).
3. **OCR rescue** (`ensureTesseract()`, Tesseract.js loaded on demand) — runs *only* on pages where step 1–2 found essentially nothing (1–6 words of text, matching the confirmed signature of flattened-image labels like some UPS Ground Saver / USPS-hybrid PDFs where the entire label — including the tracking number — is a picture, not text). Searches the rendered image for a `1Z...` (UPS) or `YWE...` (Uniuni) pattern. This never runs on pages that already parsed via text, so normal batch speed is unaffected. When it succeeds, the order is flagged `_ocrRescued: true` so the print flow knows to overlay a large, readable SKU/location banner on top of that specific label (its own printed text is often tiny).
4. **Missing Labels, honestly** — if nothing above finds a real tracking number, the page is *not* given a fake ID pretending to be scannable (an earlier version did exactly this, mislabeling real UPS/FedEx packages as "Uniuni" based on a blind "tall page" guess — removed). It goes to the Missing Labels panel with its rendered image and captured text tokens, for manual handling. This is the actual safety net: no label is ever silently lost, but not everything can be auto-recognized either, and pretending otherwise is worse than an honest miss.

**Scan-gun matching (Pack Station) is a separate concern from import extraction** — the scanner may output extra encoded data around the real tracking number (other GS1 Application Identifiers, service codes) that a naive substring check can miss. `whExtractTrackingCandidates()` / `whExtractBestTracking()` (credited to an external Codex-authored contribution, reviewed and merged after verifying the regex logic directly) scores every plausible carrier-shaped candidate found in the raw scan, plus a position-based "last 12 digits" candidate for FedEx specifically, and checks *all* of them against real stored order tracking numbers — not just the single top-scored guess — before falling back to a not-found error.

If FedEx or UPS scanning issues resurface, the fastest path to a real diagnosis is **not** more theorizing — pull the actual PDF or a real scan-gun failure and check `pdftotext -layout` against it directly, or use the `═══ SCAN NOT FOUND ═══` block now written to the debug log on every scan miss (Import tab → 📋 COPY DEBUG LOG), which shows the exact raw scanned string, every extracted candidate, and every stored order tracking number being compared against.

---

## 🔧 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML/CSS/JS — single `index.html`, no framework |
| Layout | CSS Grid (body) + `position:absolute` views, visibility toggle via `gv()` |
| Auth | Clerk (`@clerk/clerk-js`) |
| Billing | Stripe Checkout via Worker-proxied endpoints |
| Backend | Cloudflare Worker (`warehub-worker`) |
| Database | Cloudflare D1 (`warehub-db`) — primary store for orders, returns, vehicle trips, settings, insights |
| Sync strategy | Dual-write: every write goes to `localStorage` first (instant, offline-safe), then to the Worker API (async); reads try the API first and fall back to `localStorage` silently |
| Legacy sync | Cloudflare KV (`WAREHUB_KV`) — still used for some staff sync paths |
| PDF Parsing | pdf.js 3.11.174 — lazy loaded on first PDF drop |
| OCR | Tesseract.js 5.0.4 — lazy loaded only when a page's text extraction finds essentially nothing (see Tracking Number Extraction above); adds real one-time download weight on first use, not on every batch |
| Excel Export | SheetJS (xlsx) — lazy loaded on Excel connect |
| Barcode Generation | JsBarcode — lazy loaded for printed location labels |
| Excel Auth | Microsoft Graph API via MSAL.js — lazy loaded on Excel connect |
| Maps | Google Maps JS API + Places API (`loading=async`), key restricted to `app.wareplatform.com` |
| AI Assistant | Anthropic Claude (`claude-sonnet-5`) via Worker proxy at `/api/ai` |
| AI Insights (nightly) | Anthropic Claude (`claude-haiku-4-5`) via `/api/insights` |
| i18n | English / Traditional Chinese / Spanish — covers main navigation and Pack Station so far (a per-device localStorage preference, not synced across devices); extending coverage to the rest of the app is an ongoing effort, not yet complete |
| Deployment | GitHub Pages — auto-deploy on push to `main` |

---

## 🔗 Connected Services

### GitHub Pages (Frontend)
- **Repo:** `https://github.com/imluoai/warehub-app`
- **Live (custom domain):** `https://app.wareplatform.com/`
- **Deploy:** `git add . && git commit -m "msg" && git push`
- Pages deploys in ~1 min. Hard refresh: `Ctrl+Shift+R` / `Cmd+Shift+R` — confirm this after every deploy involving parsing/matching logic; several rounds of "still broken" turned out to be stale deployments, not code issues.
- **CNAME record:** `app.wareplatform.com → imluoai.github.io`

### Cloudflare Worker (API)
- **Dashboard:** dash.cloudflare.com
- **Worker name:** `warehub-worker`
- **Custom domain:** `https://api.wareplatform.com`
- **Key endpoints:** `/api/ai` (AI proxy) · `/api/orders` · `/api/orders/lookup` (used by Out-of-Stock; raw scanned string, server-side `LIKE` fallback) · `/api/returns` · `/api/vehicle/trips` · `/api/settings` (generic flexible JSON store — also used for `rack_config` and `rack_inventory`, the rack layout and tracked-inventory data) · `/api/events` · `/api/insights` · `/api/packers` · `/api/packers/sync` · `/api/tenants/register` · `/api/billing/checkout` · `/api/billing/webhook` · `/api/billing/status`
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
- **Status:** A tighter, direct pull-from-Lingxing integration was explored but is blocked — Lingxing declined to grant the needed API permission. PDF export → Import tab remains the supported path; WareHub's own tracked inventory (Rack Map, Receiving, Returns, FBA) is the source of truth going forward rather than relying on Lingxing for stock data.

---

## 📦 Supported Carriers

| Carrier | Tracking Format | Notes |
|---------|----------------|-------|
| UPS | `1Z...` (14–18 chars) | Real barcode text when present; falls back to OCR when the label flattens the whole thing into an image (common on some UPS Ground Saver / USPS-hybrid labels) |
| FedEx | 12-digit number | Extracted by position (last 12 digits of the barcode row) or from the explicit `TRK#` label — **not** by leading-digit pattern, which varies by region and previously caused real packages to collide on a shared static prefix |
| GOFO | `GFUS...` | |
| USPS | `92–98...` / Certified `70...` / 20–22 digit | |
| SpeedX | `SPX...` / `SDX...` | |
| SWIFT | `SWF...` / `SW+digits` | |
| Uniuni | `YWE` + 14 digits (real format, confirmed against actual batch data) or `UUS...` when only the word "UNIUNI" is confirmed present in the text | Never assigned as a guess based on page shape alone — that produced real mislabeling and has been removed |
| LSO | `LSO...` / `1L...` | |
| OnTrac | `C/D + 14 digits` | |
| Amazon | `TBA...` / `1DS...` | |
| DHL | `GM...` / `JD...` / 10–11 digits | |

Any label that doesn't resolve to a real tracking number through this list — including via OCR — lands in **Missing Labels**, not a fake placeholder ID.

---

## 🖨 Label Printing

| Button | What it does |
|--------|-------------|
| **🖨 PRINT BY SKU GROUP** | Sorts all labels by SKU, prints each group together. Each order prints exactly once (deduped by tracking number). Sorted by shelf location within each group. OCR-rescued orders get a large SKU/location overlay banner (their underlying printed text is often tiny); normally-parsed labels print as-is. |
| **🖨 PRINT BY PACKER** | Prints a full 4"×6" color-coded divider page per packer (name + label count), followed by their label stack sorted by shelf location. Unassigned orders grouped at the end. |
| **🖨 PRINT MISSING LABELS** | Reprints every unidentified label's rendered image, sorted by SKU (grouped, not random page order), with a large text overlay of whatever was actually captured from the page (often just a SKU and shelf location) since the original printed text is frequently tiny or the label is a flattened image. |
| **🖨 PRINT LOCATION LABELS** (Rack Map) | One label per configured rack spot, landscape (6"×4"), large location ID plus a real Code128 barcode — for physically labeling shelves. |

Label prints use `@page { size: 4in 6in; margin: 0 }` (or `6in 4in` for location labels) for direct thermal printer output, rendered via a hidden iframe to avoid background-tab throttling issues popup windows used to hit.

---

## 👥 Multi-Packer Workflow

1. Import PDF batch → labels loaded into queue
2. **Packers tab → Auto-Assign** distributes orders evenly across active packers
3. **🖨 PRINT BY PACKER** → one stack per packer with a named divider cover page
4. Manager hands each packer their physical label stack
5. Each packer logs in at Pack Station with their ID barcode
6. Scan completions are credited to `order.assignedTo` — correct packer always gets credit; completing an order also deducts its SKUs from tracked inventory (`_inventoryData`), the location with the most on hand for each SKU
7. **Stats tab** shows all on-shift packers with orders completed, avg pack speed, and active status — intended for owner/manager use, not as a packer-facing leaderboard

---

## 📦 Pack Station — Scan Flow

| Order type | Scan flow |
|---|---|
| Single item | Scan shipping label → ✅ done (1 scan) |
| Multi-item | Scan shipping label → scan each SKU barcode → ✅ done |
| Multi-packer | Each packer logs in with their own ID card → orders attributed by `assignedTo` |

On a successful scan (or a re-scan of an already-completed order), a large SKU + real shelf-location callout appears in the main display area, sourced from tracked inventory data rather than the order's own staging shelf field.

---

## 📥 Receiving vs. 📦 Returns vs. 📤 FBA Outbound — inventory sync at a glance

All three now affect the same underlying tracked inventory (`_inventoryData`, synced via `/api/settings`), but in different directions:

| Action | Effect on tracked inventory |
|---|---|
| **Receiving** — new stock arrives | Adds |
| **Returns** — restocking a previously-sold item | Adds |
| **Order completion** (Pack Station) | Deducts |
| **FBA Outbound submission** | Deducts |
| **CSV import to Rack Map** | Merges in (does not overwrite existing data) |

Editing or deleting a Returns entry or an FBA shipment correctly reconciles the old contribution before applying the new one — this used to only update the visible record with zero effect on actual inventory, which has been fixed.

---

## 📦 Returns — Fields Captured

Tracking · Carrier · Return Type · Item Condition · SKU · Qty · Return Pile · Restock Location · Notes · Photos · Scanned By · Manager Review flag

**Return Piles:** A = Resellable · B = Needs Inspection · C = Damaged/Dispose · D = Manager Review

**Conditions triggering manager alert:** Opened Damaged · Item Damaged · Items Missing · Suspected Counterfeit

Every logged return is editable afterward (✏️ button) — location, SKU, qty, condition, everything — with inventory correctly reconciled rather than just the display changing. The Location field autocompletes against real configured Rack Map spot IDs and auto-normalizes formatting (zero-padding, etc.) so a typed location reliably matches the real spot.

---

## 💾 Data Persistence

Dual-write model: every write lands in `localStorage` immediately, then syncs to the Worker/D1 asynchronously. Reads try the API first and fall back to `localStorage` if the Worker is unreachable, so the app stays usable offline.

| Data | Primary store | Cross-device |
|------|---------|--------------|
| Orders, Returns, Vehicle trips, Settings, Insights | Cloudflare D1 via Worker API | ✅ |
| Rack layout (`rack_config`) & tracked inventory (`rack_inventory`) | Stored via `/api/settings` (generic JSON blob) | ✅ |
| FBA Outbound records | `localStorage` (`fbaRecords`/`fbaSaveLocal`) | ❌ per browser — not yet synced to the backend |
| Receiving log | `localStorage` | ❌ per browser |
| Packers & managers | D1 API (+ legacy KV path) | ✅ |
| Language preference | `localStorage` | ❌ per device, intentionally (personal preference) |
| Everything above, offline | localStorage | ❌ per browser until next sync |

⚠️ FBA Outbound and the Receiving log are **not currently synced across devices** — worth knowing if more than one person/device needs to see the same data. A cross-device sync for these would need backend work (a new D1 column or table), which is outside what can be done by editing `index.html` alone.

---

## 🐛 Common Issues & Fixes

| Problem | Fix |
|---------|-----|
| Staff/data not syncing | ☁ icon red → check Worker deployed, D1/KV bindings set, Cloudflare Access disabled |
| ☁ turns red | Click the ☁ icon → runs a live connectivity test with the exact error message |
| AI not responding | 🤖 → ⚙ SETUP → verify Worker URL and that `ANTHROPIC_KEY` secret is set |
| Excel 401 error | Token expired — Stats tab → ⊞ CONNECT EXCEL → sign in again |
| Google Maps blank | Enable all 3 Maps APIs in Google Cloud Console; check key's referrer restriction includes `app.wareplatform.com` |
| PDF not parsing / labels missing | Re-export from OMP · Import tab → 📋 COPY DEBUG LOG for exact per-page detail (now logs full word detail for every skipped page, not just the first 3) |
| A carrier's labels won't scan at Pack Station | Don't guess — reproduce the failure, then pull the `═══ SCAN NOT FOUND ═══` block from the debug log (raw scanned string + every extracted candidate + every stored tracking number). See **Tracking Number Extraction** above for the full extraction chain and its history of wrong assumptions. |
| Print buttons do nothing | Allow popups for `app.wareplatform.com` in the browser |
| App shows old / doesn't reflect a recent fix | `Ctrl+Shift+R` (PC) / `Cmd+Shift+R` (Mac) — confirm the deploy actually went through (`git status`, `git log`) before assuming a fix didn't work |
| Rack Map zone stuck too large/small from dragging | Configure Layout → type exact X/Y/Width/Height directly, or use the ↺ reset button on the zone in Edit Positions mode |
| Two zones generating colliding spot IDs | Each zone needs its own unique **Prefix**, not just a unique Zone Name — save is now blocked if two zones share a prefix |
| FedEx status check fails | Use production FedEx credentials, not sandbox — sandbox blocks browser CORS |
| Billing/checkout errors | Confirm Stripe is in live mode and webhook secret matches the live endpoint |

---

## 📝 Changelog

### September 2026
- **feat:** New **📥 Receiving** tab — dedicated SKU → Location → Quantity scanning for new incoming stock, persisted log, today/total stats, Excel export. Replaces an earlier session-only modal version.
- **feat:** Pack Station now shows a large SKU + real shelf-location callout on every successful scan (and on re-scanning an already-completed order)
- **feat:** Floor Display **🎯 Pick Queue** — cross-references pending orders' SKUs against real tracked inventory locations, grouped by location for efficient picking; distinct pulsing highlight on the map for "needs picking" vs. staging status
- **feat:** Rack Map — exact numeric X/Y/Width/Height fields in Configure Layout, 20px snap-to-grid with visible overlay in edit mode, maximum drag-resize size cap, ↺ per-zone reset-to-natural-size button, large vertical warehouse-sign-style side labels, dynamic per-zone spot text sizing, duplicate-prefix save guard, landscape (6×4) location labels with real barcodes
- **feat:** Multi-language support (English / Traditional Chinese / Spanish) — covers main nav + Pack Station so far, per-device preference
- **feat:** Inventory sync across Returns (submit + edit + delete, properly reconciled), FBA Outbound (submit + edit + delete, properly reconciled), Receiving, and order completion (deducts on pack) — previously only Returns' initial submit touched tracked inventory at all
- **feat:** Targeted OCR rescue (Tesseract.js, lazy-loaded) for the narrow case of flattened-image labels with no extractable tracking text — runs only on pages that already fail fast text extraction, so normal batch speed is unaffected
- **feat:** Multi-carrier scan-gun candidate extraction for Pack Station matching — scores every plausible carrier-shaped candidate in the raw scan rather than trusting a single extracted value (credited to an external Codex-authored contribution, reviewed line-by-line before merging)
- **fix:** FedEx domestic tracking extraction was matching a static, non-unique account/facility barcode prefix instead of the real per-package number — confirmed against real batches where dozens of genuinely different packages were colliding on one fake "tracking number." Rebuilt around position (last 12 digits of the barcode row) rather than any digit-prefix pattern, since the leading digits vary by region.
- **fix:** FedEx International (Connect Plus) labels weren't recognized as FedEx at all (no literal "FedEx" text in some label templates) — broadened carrier detection hints
- **fix:** Removed a blind "tall page = Uniuni" fallback that was mislabeling real UPS/other-carrier labels as Uniuni with a fake unscannable ID — replaced with honest Missing Labels handling plus (where applicable) OCR
- **fix:** CSV import to Rack Map previously overwrote all existing tracked inventory instead of merging, and never actually persisted anything (in-memory only, lost on refresh)
- **fix:** Skipped-page image capture cap raised from 50 to 500, given the business cost of a missed label
- **security/architecture:** Confirmed Lingxing API integration is blocked (permission declined) — WareHub's own tracked inventory is being built out as the source of truth rather than depending on it

### August 2026
- **security:** Removed the internal Dev Panel (service config, API key references, changelog) from the shipped app — it was static HTML served to every visitor regardless of auth state
- **security:** Rotated Google Maps API key after review
- **security:** Fixed a stray `[Resource from github...]` string that had been accidentally committed before `<!DOCTYPE html>` in `index.html`
- **content:** Replaced placeholder landing page testimonials with real quotes from actual users and clients
- **feat:** Added a third pricing tier (Basic, $29/mo) alongside Starter ($79/mo) and Pro ($149/mo); aligned pricing across `billing.html`, `landing.html`, and the Worker's `STRIPE_PRICES` map, which had previously drifted out of sync
- **fix:** Mobile-responsive styles added to `billing.html` (previously fixed-width plan cards overflowed on small screens)

### April 2026 — v2.5
- **feat:** Domain migration → wareplatform.com (app / api / landing page)
- **feat:** Landing page deployed on Cloudflare Pages — hero, features, pricing, testimonials
- **feat:** User menu in header — avatar, name/email, Billing link, sign out (Clerk)
- **feat:** FBA Reprint Queue — persistent panel for missing FBA box labels
- **feat:** Missing-labels panel with per-label reprint buttons
- **fix:** FedEx shared batch barcode — 3-tier fallback prevents duplicate tracking (superseded by the September 2026 position-based rebuild above)
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
├── SHIPPING_LABEL_RULES.md ← Internal label-parsing design notes (worth updating alongside this README given the September 2026 extraction rebuild)
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
