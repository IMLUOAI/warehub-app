# WAREHUB
### Warehouse Management App — Double Sided ISCM LLC
**1701 10th St Suite 200 · Plano, TX 75074 · 9,129 sqft warehouse**

> Single-file browser app. No installation, no server, no database.
> Runs entirely from `index.html` hosted on GitHub Pages.

---

## 🚀 Live App

**[https://imluoai.github.io/warehub-app/](https://imluoai.github.io/warehub-app/)**

---

## 🔐 PIN Lock

App is protected by a 6-digit PIN on every open. PIN is hashed with **SHA-256** in the browser and stored in **Cloudflare KV** — one PIN works across all devices and browsers automatically.

- **First open:** prompted to set a new PIN (enter + confirm)
- **Subsequent opens:** enter PIN to unlock — session stays open until tab is closed
- **Change PIN:** ⚙ Dev Panel → 🔐 Security → RESET PIN
- PIN value is never stored in plaintext anywhere

---

## 📋 Tabs Overview

| Tab | Purpose |
|-----|---------|
| **Import** | Drag & drop PDF from Lingxing OMP. Auto-detects carrier, tracking, SKU, shelf location. Shows `X/N labels parsed` with warning if any pages were skipped. |
| **Packers** | Add/remove staff. Auto-syncs to Cloudflare KV (all browsers). Print CR80 ID cards. Auto-assign orders. Print pick lists. |
| **Pack Station** | Scan gun workflow — scan packer barcode to clock in/out. Single-item orders complete in 1 scan. Multi-item orders require SKU verification. Supports simultaneous multi-packer operation with per-packer order attribution. |
| **Dashboard** | Live KPIs, shift progress, packer leaderboard, carrier breakdown, orders table. |
| **📊 Stats** | Productivity chart — packages/speed per packer, active status, timesheet, clock-in log. Connect Excel to save snapshot. |
| **Floor Display** | Minimal big-screen view for warehouse TV — remaining orders and active packers. |
| **📦 Returns** | Scan return packages. Log carrier, type, condition, SKU, restock location, pile assignment, photos. Auto-saves to Excel. Manager alert on damaged/counterfeit items. |
| **🚗 Vehicle** | Trip log — driver, license plate, Google Maps destination, odometer, departure/return time, notes. Save to Excel. |
| **🗺 Rack Map** | Interactive SVG warehouse layout — 83 spots across 6 zones. Click cells to see contents. Scan gun LOCATE/ASSIGN modes. Inventory CSV import. |
| **📤 FBA Outbound** | End-of-day manager form — log FBA Shipment ID, FC destination, carrier + tracking to FC, boxes, units, box dims, weight per box, dynamic SKU rows. Saves to Excel + CSV export. |
| **⚙ Dev Panel** | All service accounts, API keys, fix guides, PIN reset, changelog, editable notes. |

---

## 🔧 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML/CSS/JS — single `index.html` (~345KB), no framework |
| Layout | CSS Grid (body) + `position:absolute` views, visibility toggle |
| Theme | Midnight Slate — `#1a1f2e` base, `#818cf8` indigo accent |
| PDF Parsing | pdf.js 3.11.174 — lazy loaded on first PDF drop; renders labels at 2.0× scale / JPEG 92% |
| Auth | MSAL.js 2.37.0 — lazy loaded on Excel connect |
| Maps | Google Maps JS API + Places API (`loading=async`) |
| AI | Anthropic Claude Sonnet via Cloudflare Worker proxy |
| PIN Security | SHA-256 (WebCrypto) + Cloudflare KV |
| Staff Sync | Cloudflare KV — cross-browser, no login |
| Excel Sync | Microsoft Graph API → OneDrive (Stats, Returns, Vehicle) |
| Deployment | GitHub Pages — auto-deploy on push to `main` |

---

## 🔗 Connected Services

### GitHub Pages
- **Repo:** `https://github.com/imluoai/warehub-app`
- **Live:** `https://imluoai.github.io/warehub-app/`
- **Deploy:** `git add index.html README.md && git commit -m "msg" && git push`
- Pages deploys in ~1 min. Hard refresh: `Ctrl+Shift+R` / `Cmd+Shift+R`

### Cloudflare Worker
- **Dashboard:** dash.cloudflare.com
- **Worker name:** `anthropic-proxy`
- **URL:** `https://anthropic-proxy.imluoai.workers.dev/`
- **Endpoints:**
  - `POST /` → Anthropic AI proxy
  - `GET /staff` · `PUT /staff` → staff KV sync
  - `GET /pin` · `PUT /pin` → PIN hash KV sync
  - `GET /` → health check
- **Secrets:** `ANTHROPIC_KEY`
- **KV Binding:** `WAREHUB_KV` → namespace `warehub-data`
- **⚠ Cloudflare Access must be DISABLED**
- **CORS:** `Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS` required on all responses

### Cloudflare KV
- **Namespace:** `warehub-data`
- **Binding variable:** `WAREHUB_KV`
- **Keys stored:**
  - `staff` — packers + managers JSON
  - `pin` — SHA-256 PIN hash
- **Free tier:** 100k reads/day · 1k writes/day · $0/month
- **Status:** ☁ icon in header — grey=off · amber=syncing · green=OK · red=error
- **Live test:** click the ☁ icon — pings `/staff`, reports exact error if failing

### Microsoft Azure (Excel Online)
- **Portal:** portal.azure.com
- **App Registration:** Warehub (SPA type)
- **Required permissions:** `Files.ReadWrite` · `Sites.ReadWrite.All` · `User.Read`
- **Redirect URI:** `https://imluoai.github.io/warehub-app/`
- **Excel sheets written:** `Productivity` · `Returns Log` · `Vehicle Log`
- **Token expiry:** ~1 hour — reconnect via Stats tab → ⊞ CONNECT EXCEL

### Google Maps
- **Console:** console.cloud.google.com
- **Enabled APIs:** Maps JavaScript API · Places API · Maps Embed API
- **Key:** `AIzaSyDW3aqZisH4Fl6p725LQdEp1V8fh0laqrw`
- **Restriction:** `https://imluoai.github.io/*`

### Anthropic Claude AI
- **Model:** `claude-sonnet-4-20250514`
- **API Key:** Stored as `ANTHROPIC_KEY` in Cloudflare Worker only
- **Features:** Warehouse Q&A · web search · actions (assign orders, clock in/out)

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

Both buttons use `@page { size: 4in 6in; margin: 0 }` for direct thermal printer output. Labels render at ~144 DPI (scale 2.0, JPEG 92%).

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

## 🗺 Warehouse Layout — 83 Spots

| Zone | Type | Spots | Numbering |
|------|------|-------|-----------|
| R1 🟥 | Metal Racking | 15 | R1-01 → R1-15 · bottom→top |
| R2 🟥 | Metal Racking | 8 | R2-01 → R2-08 · bottom→top |
| R3 🟥 | Metal Racking | 8 | R3-01 → R3-08 · bottom→top |
| B-1 🟦 | Ground Pile | 20 | B-1-01 → B-1-20 · bottom→top |
| A-1 🟪 | Ground Pallet | 20 | A-1-01 → A-1-20 · right→left, bottom→top |
| C-1 🟧 | Ground Pallet | 12 | C-1-01 → C-1-12 · left→right, bottom→top |

**Search formats:** `R1-01` · `r1-1` · `B-1-05` · `A-1` · `b1`

**Scan gun modes:**
- 🔍 LOCATE — scan SKU → highlights all spots containing it
- 📍 ASSIGN — click spot on map → scan SKU → assigns item

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

| Data | Storage | Cross-browser |
|------|---------|--------------|
| PIN hash | Cloudflare KV | ✅ All devices |
| Packers & managers | Cloudflare KV + localStorage | ✅ Auto-sync |
| Vehicle trips | localStorage | ❌ Save to Excel |
| Returns | localStorage | ❌ Auto-saves to Excel |
| Settings (Excel, AI) | localStorage | ❌ Per browser |
| Orders (current batch) | Memory only | ❌ Re-import PDF |

**Excel workbook tabs:** `Productivity` · `Returns Log` · `Vehicle Log` · `FBA Outbound`

---

## 🐛 Common Issues & Fixes

| Problem | Fix |
|---------|-----|
| PIN screen won't load | Worker not deployed or Cloudflare Access still ON → deploy Worker, disable Access |
| Staff lost on new browser | ☁ icon red → check Worker URL · KV binding `WAREHUB_KV` set |
| ☁ turns red | Click ☁ icon → runs live KV test with exact error message |
| AI not responding | 🤖 → ⚙ SETUP → verify Worker URL · `ANTHROPIC_KEY` secret set |
| Excel 401 error | Token expired — Stats tab → ⊞ CONNECT EXCEL → sign in again |
| Google Maps blank | Enable all 3 APIs in Google Cloud Console |
| PDF not parsing | Re-export from OMP · check Debug Log in Import tab |
| Batch count mismatch | Status bar shows `X/N labels parsed` — scroll Debug Log for skipped pages |
| FedEx multi-piece fail | Handled — GS1-128 prefix auto-stripped; raw scan fallback added |
| Print buttons do nothing | Allow popups for `imluoai.github.io` in browser |
| App shows old version | `Ctrl+Shift+R` (PC) / `Cmd+Shift+R` (Mac) |
| Stats showing only 1 packer | Fixed — shows all `active`/`online` packers using persisted order counts |

---

## 📝 Changelog

### March 2026
- **feat:** Amazon FBA Outbound tab — end-of-day shipment form with dynamic SKU rows, stats bar, filterable log, CSV + Excel export to new "FBA Outbound" sheet
- **feat:** Print by Packer — 4"×6" named divider cover page per packer, labels in shelf order
- **feat:** Batch completeness check — `X/N labels parsed` status, warns on skipped pages
- **fix:** Label image quality — scale 1.5→2.0, JPEG 82%→92% for sharper thermal output (~144 DPI)
- **fix:** `kvTestConnection()` — ☁ icon now pings Worker live and surfaces exact errors
- **fix:** FedEx GS1-128 multi-piece barcodes — raw scan fallback prevents "not found" errors
- **fix:** Multi-packer attribution — `order.assignedTo` used as primary credit source
- **fix:** Per-packer `_lastCompleteTime` map for accurate individual pack speed tracking
- **fix:** Stats panel shows all on-shift packers using persisted `p.ordersCompleted`
- **fix:** SKU-grouped label printing deduplicates multi-SKU orders correctly
- **fix:** Full carrier support — LSO, OnTrac, Amazon, DHL, SDX added to CR map + TPATS
- **fix:** Full button audit — 80+ interactive elements verified; 1 broken handler fixed

---

## 📁 File Structure

```
warehub-app/
├── index.html      ← Entire app (~345KB, single file)
└── README.md       ← This file
```

---

## 🏢 Company

**Double Sided ISCM LLC**
1701 10th St Suite 200, Plano, TX 75074
Warehouse: 9,129 sqft · Office: 1,486 sqft · Total: 10,615 sqft

---

*Built with Claude · March 2026*
