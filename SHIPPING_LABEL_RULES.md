For Warehub, build this pipeline:

Step 1

PDF/Image → OCR text

Step 2

splitMultiLabelOCR()

Step 3

classifyAndParseLabel()

Step 4

Map to:
• carrier
• subtype
• bin
• customerRef
• itemRefs
• shelfLocations
• destination state/zip

Step 5

If confidence < 0.9 → send to manual review queue

That manual review queue will save you a lot of operational mistakes.

⸻

One more thing: your file does NOT yet clearly show

From this specific PDF, I can clearly confirm:
• USPS
• USPS HAZMAT
• USPS SIGNATURE
• FEDEX e-VS hybrid
• TUBT ECO
• SPEEDX

But I cannot confidently confirm full native examples of:
• UPS
• UNIUNI
• pure standalone FedEx (non-eVS)
• native YW-branded label text (TUBT may be your YW flow, but branding in this file shows TUBT ECO)

So if you want truly complete all-carrier production sorting, the next best move is:

Upload a mixed PDF with:
• UPS
• UNIUNI
• native FedEx
• more SPEEDX
• more TUBT/YW
• USPS

Then I can build you a v2 enterprise parser with:
• per-carrier regex profiles
• confidence scoring
• fallback heuristics
• exception reason codes
• duplicate label detection

⸻

Best next step (highly recommended)

If you want, next message I can give you:

“Warehub v2 full integration package”

Including: 1. React + TypeScript service file structure 2. OCR pipeline adapter design 3. API endpoint example 4. manual review queue schema 5. carrier badge UI 6. bulk upload parser 7. Claude-ready prompt to make it wire directly into your app

That would be the exact version you can paste into Claude and let it code much more accurately.
