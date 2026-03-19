# WAREHUB
### Warehouse Management App — Double Sided ISCM LLC
**1701 10th St Suite 200 · Plano, TX 75074 · 9,129 sqft warehouse**

> A fully browser-based warehouse operations app. No installation, no server, no database.  
> Runs entirely from a single `index.html` hosted on GitHub Pages.

---

## 🚀 Live App

**[https://imluoai.github.io/warehub-app/](https://imluoai.github.io/warehub-app/)**

---

## 📋 Features Overview

| Tab | Purpose |
|-----|---------|
| **Import** | Drag & drop PDF from Lingxing OMP. Auto-detects carrier, tracking, SKU, shelf. Click anywhere on tab or use drop zone. |
| **Packers** | Add/remove staff. Auto-saves to Cloudflare KV (cross-browser). Print CR80 ID cards. Auto-assign orders. Print pick lists. |
| **Pack Station** | Scan gun workflow — scan packer barcode to clock in/out. 2-step item verify + shipping label scan. Multi-packer support. |
| **Dashboard** | Live KPIs, shift progress, packer leaderboard, carrier breakdown, orders table. |
| **Payroll** | Time sheets, clock-in/out history, hours, packages. Export CSV or save to Excel Online. |
| **Floor Display** | Minimal big-screen view — remaining orders and active packers for warehouse TV. |
| **🚗 Vehicle** | Trip log — driver, Google Maps destination search, odometer, mileage, notes. Save to Excel. |
| **🗺 Rack Map** | Interactive SVG warehouse layout — 83 spots across 6 zones. Click cells to see contents. Scan gun LOCATE/ASSIGN modes. Import inventory CSV. |
| **⚙ Dev Panel** | All service accounts, API keys, fix guides, editable notes, exportable reference. |

---

## 🔧 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML/CSS/JS — single `index.html` (~277KB), no framework |
| Layout | CSS Grid (body) + position:absolute views |
| PDF Parsing | pdf.js 3.11.174 — lazy loaded on first PDF drop |
| Auth | MSAL.js 2.37.0 — lazy loaded on Excel connect |
| Maps | Google Maps JS API + Places API (loading=async) |
| AI | Anthropic Claude Sonnet via Cloudflare Worker proxy |
| Staff Sync | Cloudflare KV (cross-browser, no login) |
| Excel Sync | Microsoft Graph API → OneDrive (payroll + vehicle) |
| Deployment | GitHub Pages (auto-deploy on push to `main`) |

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
- **Endpoints:** `POST /` → AI proxy · `GET /staff` → read KV · `PUT /staff` → write KV
- **Secrets:** `ANTHROPIC_KEY` (Anthropic API key)
- **KV Binding:** `WAREHUB_KV` → namespace `warehub-data`
- **⚠ Cloudflare Access must be DISABLED on this worker**
- **Set URL in app:** 🤖 → ⚙ SETUP → paste URL → Save

### Cloudflare KV (Staff Sync)
- **Namespace:** `warehub-data`
- **Binding variable:** `WAREHUB_KV`
- **Key stored:** `staff` (JSON: packers + managers)
- **How it works:** Staff auto-saves on every add/edit/remove. Loads on app open on any browser. No login required.
- **Status:** ☁ in header — grey=not set · amber=syncing · green=OK · red=error
- **Free tier:** 100k reads/day · 1k writes/day · $0/month

### Microsoft Azure (Excel Online)
- **Portal:** portal.azure.com
- **App Registration:** Warehub (SPA type)
- **Required permissions:** `Files.ReadWrite` · `Sites.ReadWrite.All` · `User.Read`
- **Redirect URI:** `https://imluoai.github.io/warehub-app/`
- **Used for:** Payroll timesheet · Vehicle trip log
- **Fix expired token:** Payroll → ⚙ → DISCONNECT → CONNECT EXCEL → sign in

### Google Maps
- **Console:** console.cloud.google.com
- **Enabled APIs:** Maps JavaScript API · Places API · Maps Embed API
- **Key:** `AIzaSyDW3aqZisH4Fl6p725LQdEp1V8fh0laqrw`
- **Restriction:** `https://imluoai.github.io/*`
- **Fix blank map:** Verify all 3 APIs enabled in Google Cloud Console

### Anthropic Claude AI
- **Model:** `claude-sonnet-4-20250514`
- **API Key:** Stored as `ANTHROPIC_KEY` in Cloudflare Worker only
- **Features:** Warehouse Q&A · web search · actions (assign orders, clock in/out)

### Lingxing ERP / OMP
- **URL:** omp.xlms.com/wms/outbound/parcel
- **Integration:** Export labels as PDF → drag into Import tab (or click drop zone)

---

## 📦 Supported Carriers

| Carrier | Tracking Pattern |
|---------|----------------|
| GOFO | `GFUS...` |
| FedEx | `96...` / `61...` / `74...` |
| UPS | `1Z...` |
| USPS | `9[1-8]...` |
| SWIFT | `SW...` |
| SpeedX | `SPX...` |
| Uniuni | `UUS...` (QR-code) |

---

## 🗺 Warehouse Layout — 83 Spots Total

| Zone | Type | Spots | Numbering |
|------|------|-------|-----------|
| R1 🟥 | Metal Racking | 15 | R1-01 → R1-15 (bottom→top) |
| R2 🟥 | Metal Racking | 8 | R2-01 → R2-08 (bottom→top) |
| R3 🟥 | Metal Racking | 8 | R3-01 → R3-08 (bottom→top) |
| B-1 🟦 | Ground Pile | 20 | B-1-01 → B-1-20 (bottom→top) |
| A-1 🟪 | Ground Pallet | 20 | A-1-01 → A-1-20 (right→left, bottom→top) |
| C-1 🟧 | Ground Pallet | 12 | C-1-01 → C-1-12 (left→right, bottom→top) |

**Search formats:** `R1-01` · `r1-1` · `B-1-05` · `b-1-5` · `A-1` · `b1`

**Scan gun modes:**
- 🔍 LOCATE — scan SKU barcode → highlights all spots containing it
- 📍 ASSIGN — click a spot on map → scan SKU → assigns item to that location

**Inventory CSV:** 5 SKU slots per location · template in Rack Map tab

---

## 🖨 Print System

- **ID Cards:** CR80 badge · barcode + name + ID · 🪪 PRINT ALL ID CARDS button
- **Pick Lists:** One page per packer · sorted by shelf
- **Requirement:** Allow popups for `imluoai.github.io` in browser settings

---

## 💾 Data Persistence

| Data | Storage | Cross-browser? |
|------|---------|---------------|
| Packers & managers | Cloudflare KV + localStorage | ✅ Yes — auto-sync |
| Shift sessions / hours | localStorage | ❌ Browser only |
| Vehicle trips | localStorage | ❌ Save to Excel |
| Settings (Excel, AI, Maps) | localStorage | ❌ Browser only |
| Orders (current batch) | Memory only | ❌ Re-import PDF |

**End-of-day workflow:**
1. Complete all orders in Pack Station
2. Payroll → 📊 SAVE TO EXCEL
3. Vehicle → 📊 SAVE TO EXCEL
4. Payroll → ↺ RESET HOURS

---

## 🐛 Common Issues & Fixes

| Problem | Fix |
|---------|-----|
| Print buttons do nothing | Allow popups for `imluoai.github.io` in browser |
| AI not responding | 🤖 → ⚙ SETUP → verify Worker URL · check ANTHROPIC_KEY set · Cloudflare Access OFF |
| Staff lost on new browser | Set Worker URL in 🤖 → ⚙ SETUP → ☁ will load staff automatically |
| ☁ icon shows red | Worker URL wrong or KV binding `WAREHUB_KV` not set in Cloudflare |
| Excel connect fails | Azure redirect URI must match exactly · token expires ~1hr |
| Google Maps blank | Enable Maps Embed API separately in Google Cloud Console |
| Scan gun not registering | Click Pack Station tab → input auto-focuses |
| PDF not parsing | Re-export from OMP · check Debug Log in Import tab |
| App shows old version | Hard refresh: `Ctrl+Shift+R` (PC) / `Cmd+Shift+R` (Mac) |

---

## 📁 File Structure

```
warehub-app/
├── index.html      ← Entire app (~277KB, single file)
└── README.md       ← This file
```

---

## 🏢 Company

**Double Sided ISCM LLC**  
1701 10th St Suite 200, Plano, TX 75074  
Warehouse: 9,129 sqft · Office: 1,486 sqft · Total: 10,615 sqft

---

*Built with Claude · March 2026*