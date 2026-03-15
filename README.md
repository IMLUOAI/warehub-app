WAREHUB
Warehouse Management App — Double Sided ISCM LLC
1701 10th St Suite 200 · Plano, TX 75074 · 9,129 sqft warehouse

A fully browser-based warehouse operations app. No installation, no server, no database.
Runs entirely from a single index.html hosted on GitHub Pages.


🚀 Live App
https://imluoai.github.io/warehub-app/

📋 Features Overview
TabPurposeImportDrag & drop shipping label PDFs from Lingxing OMP/ERP. Auto-detects carrier, tracking, SKU, shelf.PackersAdd/remove staff. Print ID cards (4×6 thermal CR80). Auto-assign orders. Print pick lists.Pack StationScan gun workflow — clock in/out, 2-step item verify, multi-packer simultaneous support.DashboardLive KPIs, shift progress, packer leaderboard, carrier breakdown, orders table.PayrollTime sheets, clock-in/out history, hours, packages. Export CSV or save to Excel Online.Floor DisplayMinimal big-screen view — remaining orders and active packers.🚗 VehicleTrip log — driver, Google Maps destination search, odometer, mileage, notes. Excel sync.🗺 Rack MapInteractive SVG warehouse layout. Click zones to see orders. Pick route generator.⚙ Dev PanelAll service accounts, fix guides, editable notes, exportable reference document.

🔧 Tech Stack
LayerTechnologyFrontendVanilla HTML/CSS/JS — single index.html, no frameworkPDF Parsingpdf.js 3.11.174AuthMSAL.js 2.37.0 (Microsoft)MapsGoogle Maps Embed API + Places APIAIAnthropic Claude Sonnet 4 via Cloudflare Worker proxyStoragelocalStorage (packers, settings) — orders are session-onlyDeploymentGitHub Pages (auto-deploy on push to main)Excel SyncMicrosoft Graph API → OneDrive for Business

🔗 Connected Services
GitHub

Repo: https://github.com/imluoai/warehub-app
Deploy: git add index.html && git commit -m "msg" && git push
Pages deploys in ~1 min. Hard refresh with Ctrl+Shift+R after.

Microsoft Azure (Excel Online)

Portal: portal.azure.com
App Registration: Warehub (Single-page application / SPA)
Required permissions: Files.ReadWrite · Sites.ReadWrite.All · User.Read
Redirect URI: https://imluoai.github.io/warehub-app/
Fix token expired: Payroll → ⚙ → DISCONNECT → CONNECT EXCEL → sign in again

Google Maps

Console: console.cloud.google.com
Enabled APIs: Maps Embed API · Maps JavaScript API · Places API
Key restriction: https://imluoai.github.io/*
Fix map not loading: Verify all 3 APIs enabled in Google Cloud Console

Anthropic Claude AI

Console: console.anthropic.com
Model: claude-sonnet-4-20250514
API Key: Stored as ANTHROPIC_KEY secret in Cloudflare Worker only
Capabilities: Warehouse Q&A + web search + actions (assign orders, clock in/out)

Cloudflare Worker (AI Proxy)

Dashboard: dash.cloudflare.com
Worker name: anthropic-proxy
URL: https://anthropic-proxy.imluoai.workers.dev/
Secret variable: ANTHROPIC_KEY (type: Secret)
⚠ Cloudflare Access must be DISABLED on this worker
Fix CORS: Redeploy worker with latest code from app → 🤖 → ⚙ SETUP

Lingxing ERP / OMP

URL: omp.xlms.com/wms/outbound/parcel
Integration: Export labels as PDF → drag into Warehub Import tab
Label format: GOFO SN-D2D ECO (text-based, one label per page)


📦 Supported Carriers
CarrierTracking PrefixGOFOGFUS...FedEx96... / 61... / 74...UPS1Z...USPS9[1-8]...SWIFTSW...SpeedXSPX...UniuniUUS... (QR-code only)

🗺 Warehouse Layout
Zones — 1701 10th St Suite 200, Plano TX:
ZoneTypeNotesR1Metal Racking 🟥Tall, right column, adjacent to B-1R2Metal Racking 🟥Middle column. Aisle between R2 and R1.R3Metal Racking 🟥Left columnB-1Ground Pile 🟦New goods, same width/length as R1A-1Ground Pallet 🟪Large area, south entrance sideC-1Ground Pallet 🟧Top area near Dock-1/Dock-2
Shelf code format: R1, R2, R3, B-1, A-1, C-1

🖨 Print System
Uses window.open + Blob URL — works on GitHub Pages.
Allow popups for imluoai.github.io in browser settings once.

ID Cards: 4"×6" thermal, CR80 badge centered, pure black ink
Pick Lists: A4, one page per packer, sorted by shelf
SKU Sort: Labels grouped by SKU for batch picking


💾 Data Persistence
DataStoragePersists?Packers & managerlocalStorage✅ PermanentShift sessions / hourslocalStorage✅ Until Reset HoursVehicle tripslocalStorage✅ PermanentDev panel noteslocalStorage✅ PermanentExcel / AI settingslocalStorage✅ PermanentOrders (current batch)Memory❌ Clears on refresh
End-of-day workflow:

Pack Station — complete all orders
Payroll → 📊 SAVE TO EXCEL
Payroll → ↺ RESET HOURS


🐛 Common Issues & Fixes
ProblemFixPrint buttons do nothingAllow popups for imluoai.github.io in browserAI "Failed to fetch"Check Worker deployed, Cloudflare Access OFF, ANTHROPIC_KEY setExcel "Failed to fetch"Payroll → ⚙ → DISCONNECT → CONNECT EXCEL → sign in againGoogle Maps blankEnable Maps Embed API in Google Cloud ConsoleScan gun not registeringEnsure Pack Station active, packer clocked inOrders not parsingRe-export PDF from OMP. Check Debug Log in Import tab.App looks outdatedHard refresh: Ctrl+Shift+R / Cmd+Shift+R

📁 File Structure
warehub-app/
├── index.html      ← Entire app (~240KB, single file)
└── README.md       ← This file

🏢 Company
Double Sided ISCM LLC
1701 10th St Suite 200, Plano, TX 75074
Warehouse: 9,129 sqft · Office: 1,486 sqft · Total: 10,615 sqft

Built with Claude · March 2026