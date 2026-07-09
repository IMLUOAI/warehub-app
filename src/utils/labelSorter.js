// shippingLabelClassifier.ts
// Production-oriented rule-based shipping label classifier + field extractor
// Designed for OCR text from PDF/image labels like the ones in your 3-26.pdf

export type LabelCarrierType =
  | "USPS"
  | "USPS_HAZMAT"
  | "USPS_SIGNATURE"
  | "FEDEX_EVS"
  | "TUBT_ECO"
  | "SPEEDX"
  | "UNKNOWN";

export interface ParsedLabel {
  carrierType: LabelCarrierType;
  confidence: number;

  rawText: string;
  normalizedText: string;

  trackingNumber?: string;
  secondaryTrackingNumber?: string;

  service?: string;

  shipFromName?: string;
  shipFromAddress?: string;

  shipToName?: string;
  shipToAddress?: string;
  shipToCity?: string;
  shipToState?: string;
  shipToZip?: string;

  weight?: string;

  customerRef?: string; // PK-...
  itemRefs?: string[]; // X004..., D1..., etc
  shelfLocations?: string[]; // P-9-2, A-1-10, R-1-12, etc

  hubCode?: string; // e.g. 22 EWR.H ROC01 06 or ORD
  routeCode?: string; // SPXORD089000344126 / GFUS...

  flags: {
    hazmat: boolean,
    signatureRequired: boolean,
    finalMileUsps: boolean,
    fedexInjected: boolean,
  };

  debug: {
    matchedRules: string[],
  };
}

export function normalizeLabelText(input: string): string {
  if (!input) return "";

  return input
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[^\S\n]+\n/g, "\n")
    .trim();
}

function upper(input: string): string {
  return input.toUpperCase();
}

function firstMatch(
  text: string,
  regex: RegExp,
  group = 1
): string | undefined {
  const m = text.match(regex);
  return m?.[group]?.trim();
}

function allMatches(text: string, regex: RegExp, group = 1): string[] {
  const matches: string[] = [];
  let m: RegExpExecArray | null;
  const r = new RegExp(
    regex.source,
    regex.flags.includes("g") ? regex.flags : regex.flags + "g"
  );
  while ((m = r.exec(text)) !== null) {
    if (m[group]) matches.push(m[group].trim());
  }
  return [...new Set(matches)];
}

function cleanMultiLineBlock(block?: string): string | undefined {
  if (!block) return undefined;
  return (
    block
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .join(", ")
      .replace(/\s{2,}/g, " ")
      .trim() || undefined
  );
}

function parseCityStateZip(line?: string): {
  city?: string,
  state?: string,
  zip?: string,
} {
  if (!line) return {};
  // Matches:
  // BUFFALO NY 14218
  // FOREST PARK, IL 60130-2225
  const m = line.match(/([A-Z .'-]+),?\s+([A-Z]{2})\s+(\d{5}(?:-\d{4})?)/i);
  if (!m) return {};
  return {
    city: m[1].trim().replace(/\s{2,}/g, " "),
    state: m[2].trim().toUpperCase(),
    zip: m[3].trim(),
  };
}

function extractUSPSTracking(text: string): string | undefined {
  // USPS numbers often displayed with spaces: 9334 6110 3820 0001 4837 81
  const m = text.match(
    /(USPS (?:SIGNATURE )?TRK?NG? ?#.*?\n)?((?:9\d{3}\s\d{4}\s\d{4}\s\d{4}\s\d{4}\s\d{2})|(?:9\d{21,25}))/is
  );
  if (!m) return undefined;
  return m[2].replace(/\s+/g, "");
}

function extractFedExTracking(text: string): string | undefined {
  const m = text.match(/FEDEX TRACKING ID#\s*([0-9 ]{8,})/i);
  if (!m) return undefined;
  return m[1].replace(/\s+/g, "");
}

function extractGFUS(text: string): string | undefined {
  return firstMatch(text, /\b(GFUS\d{10,})\b/i);
}

function extractSPX(text: string): string | undefined {
  return firstMatch(text, /\b(SPX[A-Z]{3}\d{6,})\b/i);
}

function extractWeight(text: string): string | undefined {
  return (
    firstMatch(text, /\b(\d+(?:\.\d+)?\s*lb(?:Weight)?[: ]*)/i) ||
    firstMatch(text, /\b(\d+(?:\.\d+)?\s*lbs?\s*\d*\s*oz)\b/i) ||
    firstMatch(text, /\b(\d+(?:\.\d+)?\s*ozWeight[: ]*)/i) ||
    firstMatch(text, /\b(\d+(?:\.\d+)?\s*LB)\b/i)
  );
}

function extractCustomerRef(text: string): string | undefined {
  return (
    firstMatch(text, /\b(CUST REF:\s*(PK-[A-Z0-9-]+))/i) ||
    firstMatch(text, /\b(REF:\s*(PK-[A-Z0-9-]+))/i) ||
    firstMatch(text, /\b(PK-\d{8,}-\d+)\b/i)
  );
}

function extractItemRefs(text: string): string[] {
  // Product/item references seen in your labels:
  // X004CRFK99*1, D1FW01*4, TCQD61601*1, QFS-20*1, PPT-1*1, FXQ301H*2
  const refs = allMatches(
    text,
    /\b((?:X\d{4}[A-Z0-9]+|D1[A-Z0-9-]+|TCQ[A-Z0-9-]+|QFS-\d+|PPT-\d+|FXQ[A-Z0-9-]+|DPG\d+[A-Z]*|TQ-\d+)(?:\*\d+)?)\b/gi
  );
  return refs;
}

function extractShelfLocations(text: string): string[] {
  // Examples: P-9-2, A-1-10, R-1-12, B-1-14, 10-1-2
  return allMatches(text, /\b([A-Z]?-?\d+-\d+-\d+)\b/g, 1);
}

function extractShipToFromBlock(text: string): {
  shipToName?: string,
  shipToAddress?: string,
  shipToCity?: string,
  shipToState?: string,
  shipToZip?: string,
} {
  // Tries multiple patterns depending on label family

  // Pattern A: "SHIP TO:"
  const shipToBlock = firstMatch(
    text,
    /SHIP TO:\s*\n([\s\S]{0,220}?)(?:\n(?:[A-Z0-9*,-]+(?:Reference4:|$)|USPS DELIVER TO:|FROM:|TO:|$))/i
  );

  if (shipToBlock) {
    const lines = shipToBlock
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const name = lines[0];
    const cityStateZipLine = [...lines]
      .reverse()
      .find((l) => /\b[A-Z]{2}\s+\d{5}/i.test(l));
    const addressLines = cityStateZipLine
      ? lines.slice(1, lines.lastIndexOf(cityStateZipLine))
      : lines.slice(1);

    const csz = parseCityStateZip(cityStateZipLine);
    return {
      shipToName: name,
      shipToAddress: cleanMultiLineBlock(addressLines.join("\n")),
      shipToCity: csz.city,
      shipToState: csz.state,
      shipToZip: csz.zip,
    };
  }

  // Pattern B: "TO:"
  const toBlock = firstMatch(
    text,
    /TO:\s*\n([\s\S]{0,220}?)(?:\n(?:USPS DELIVER TO:|CUST REF:|FedEx Tracking ID#|USPS TRACKING #|$))/i
  );

  if (toBlock) {
    const lines = toBlock
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const name = lines[0];
    const cityStateZipLine = [...lines]
      .reverse()
      .find((l) => /\b[A-Z]{2}\s+\d{5}/i.test(l));
    const addressLines = cityStateZipLine
      ? lines.slice(1, lines.lastIndexOf(cityStateZipLine))
      : lines.slice(1);

    const csz = parseCityStateZip(cityStateZipLine);
    return {
      shipToName: name,
      shipToAddress: cleanMultiLineBlock(addressLines.join("\n")),
      shipToCity: csz.city,
      shipToState: csz.state,
      shipToZip: csz.zip,
    };
  }

  // Pattern C: USPS block after sender address
  // Find first likely recipient block before USPS tracking
  const uspsRecipientBlock = firstMatch(
    text,
    /(?:PLANO TX \d{5}(?:-\d{4})?\s*\n)(?:SIGNATURE REQUIRED\s*\n)?(?:HAZMAT - SURFACE TRANSPORTATION ONLY\s*\n)?([\s\S]{0,220}?)\nUSPS (?:SIGNATURE )?TRK?NG? ?#/i
  );

  if (uspsRecipientBlock) {
    const lines = uspsRecipientBlock
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const cityStateZipLine = [...lines]
      .reverse()
      .find((l) => /\b[A-Z]{2}\s+\d{5}/i.test(l));
    const name = lines[0];
    const addressLines = cityStateZipLine
      ? lines.slice(1, lines.lastIndexOf(cityStateZipLine))
      : lines.slice(1);

    const csz = parseCityStateZip(cityStateZipLine);
    return {
      shipToName: name,
      shipToAddress: cleanMultiLineBlock(addressLines.join("\n")),
      shipToCity: csz.city,
      shipToState: csz.state,
      shipToZip: csz.zip,
    };
  }

  return {};
}

function extractShipFrom(text: string): {
  shipFromName?: string,
  shipFromAddress?: string,
} {
  // Pattern A: explicit SHIP FROM:
  const shipFromBlock = firstMatch(
    text,
    /SHIP FROM:\s*\n([\s\S]{0,180}?)(?:\n(?:\d+(?:\.\d+)?\s*(?:lb|oz)Weight:|SHIP TO:|Reference:|$))/i
  );
  if (shipFromBlock) {
    const lines = shipFromBlock
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    return {
      shipFromName: lines[0],
      shipFromAddress: cleanMultiLineBlock(lines.slice(1).join("\n")),
    };
  }

  // Pattern B: FROM:
  const fromBlock = firstMatch(text, /FROM:\s*\n([\s\S]{0,180}?)(?:\nTO:)/i);
  if (fromBlock) {
    const lines = fromBlock
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    return {
      shipFromName: lines[0],
      shipFromAddress: cleanMultiLineBlock(lines.slice(1).join("\n")),
    };
  }

  return {};
}

export function classifyAndParseLabel(rawText: string): ParsedLabel {
  const normalizedText = normalizeLabelText(rawText);
  const textU = upper(normalizedText);

  const matchedRules: string[] = [];

  const hasUSPSApis = textU.includes("USPS APIS");
  const hasUSPSGroundAdv = textU.includes("USPS GROUND ADVANTAGE");
  const hasUSPSTracking =
    textU.includes("USPS TRACKING #") ||
    textU.includes("USPS SIGNATURE TRKNG #");
  const hasHazmat = textU.includes("HAZMAT - SURFACE TRANSPORTATION ONLY");
  const hasSignature =
    textU.includes("SIGNATURE REQUIRED") ||
    textU.includes("USPS SIGNATURE TRKNG #");

  const hasTUBT = textU.includes("TUBT ECO");
  const hasGFUS = /\bGFUS\d{10,}\b/i.test(normalizedText);

  const hasFedExTracking = textU.includes("FEDEX TRACKING ID#");
  const hasFedExGround = textU.includes("FEDEX GROUND");
  const hasEVS = textU.includes("E-VS");
  const hasParcelSelect = textU.includes("PARCEL SELECT");

  const hasSDX = /\bSDX\b/i.test(normalizedText);
  const hasSPX = /\bSPX[A-Z]{3}\d{6,}\b/i.test(normalizedText);

  let carrierType: LabelCarrierType = "UNKNOWN";
  let confidence = 0.4;

  // Rule priority matters
  if (hasFedExTracking && hasEVS && hasParcelSelect) {
    carrierType = "FEDEX_EVS";
    confidence = 0.98;
    matchedRules.push("FEDEX_EVS: FedEx Tracking + e-VS + Parcel Select");
  } else if (hasTUBT && hasGFUS) {
    carrierType = "TUBT_ECO";
    confidence = 0.99;
    matchedRules.push("TUBT_ECO: TUBT ECO + GFUS");
  } else if (hasSDX || hasSPX) {
    carrierType = "SPEEDX";
    confidence = 0.97;
    matchedRules.push("SPEEDX: SDX/SPX markers");
  } else if (hasUSPSApis || (hasUSPSGroundAdv && hasUSPSTracking)) {
    if (hasSignature) {
      carrierType = "USPS_SIGNATURE";
      confidence = 0.98;
      matchedRules.push("USPS_SIGNATURE: USPS + signature markers");
    } else if (hasHazmat) {
      carrierType = "USPS_HAZMAT";
      confidence = 0.97;
      matchedRules.push("USPS_HAZMAT: USPS + hazmat marker");
    } else {
      carrierType = "USPS";
      confidence = 0.96;
      matchedRules.push("USPS: USPS APIs / Ground Advantage");
    }
  }

  const uspsTracking = extractUSPSTracking(normalizedText);
  const fedexTracking = extractFedExTracking(normalizedText);
  const gfus = extractGFUS(normalizedText);
  const spx = extractSPX(normalizedText);

  const shipFrom = extractShipFrom(normalizedText);
  const shipTo = extractShipToFromBlock(normalizedText);

  const itemRefs = extractItemRefs(normalizedText);
  const shelfLocations = extractShelfLocations(normalizedText);

  let trackingNumber: string | undefined;
  let secondaryTrackingNumber: string | undefined;
  let service: string | undefined;
  let hubCode: string | undefined;
  let routeCode: string | undefined;

  switch (carrierType) {
    case "USPS":
    case "USPS_HAZMAT":
    case "USPS_SIGNATURE":
      trackingNumber = uspsTracking;
      service = hasUSPSGroundAdv ? "USPS Ground Advantage" : "USPS";
      break;

    case "FEDEX_EVS":
      trackingNumber = fedexTracking;
      secondaryTrackingNumber = uspsTracking;
      service = "FedEx Ground e-VS / Parcel Select";
      break;

    case "TUBT_ECO":
      trackingNumber = gfus;
      routeCode = gfus;
      service = "TUBT ECO";
      hubCode = firstMatch(
        normalizedText,
        /\n([0-9]{2}\s+[A-Z]{3}\.H\s+[A-Z0-9]{4,}\s+[A-Z0-9]{1,4})\n/i
      );
      break;

    case "SPEEDX":
      trackingNumber = spx;
      routeCode = spx;
      service = "SPEEDX / SDX";
      hubCode = firstMatch(normalizedText, /^\s*([A-Z]{3})\s*$/m);
      break;

    default:
      trackingNumber = fedexTracking || uspsTracking || gfus || spx;
      break;
  }

  return {
    carrierType,
    confidence,
    rawText,
    normalizedText,
    trackingNumber,
    secondaryTrackingNumber,
    service,
    shipFromName: shipFrom.shipFromName,
    shipFromAddress: shipFrom.shipFromAddress,
    shipToName: shipTo.shipToName,
    shipToAddress: shipTo.shipToAddress,
    shipToCity: shipTo.shipToCity,
    shipToState: shipTo.shipToState,
    shipToZip: shipTo.shipToZip,
    weight: extractWeight(normalizedText),
    customerRef: extractCustomerRef(normalizedText),
    itemRefs,
    shelfLocations,
    hubCode,
    routeCode,
    flags: {
      hazmat: hasHazmat,
      signatureRequired: hasSignature,
      finalMileUsps: hasEVS || hasUSPSTracking,
      fedexInjected: hasFedExTracking || hasFedExGround,
    },
    debug: {
      matchedRules,
    },
  };
}

// shippingLabelSplitter.ts

import { classifyAndParseLabel, ParsedLabel } from "./shippingLabelClassifier";

export function splitMultiLabelOCR(rawText: string): string[] {
  const text = rawText.replace(/\r/g, "\n");

  // Split before strong label headers while preserving them
  const splitRegex =
    /(?=(?:\n|^)(?:USPS APIs|TUBT ECO|FROM:|(?:ORD|EWR|LAX|ATL|JFK|DFW|MIA|MCO|BOS|CNO)\s*$))/gm;

  const parts = text
    .split(splitRegex)
    .map((s) => s.trim())
    .filter(Boolean);

  // Merge stray fragments if needed
  const merged: string[] = [];
  for (const part of parts) {
    if (
      merged.length > 0 &&
      !/^(USPS APIs|TUBT ECO|FROM:|ORD|EWR|LAX|ATL|JFK|DFW|MIA|MCO|BOS|CNO)\b/m.test(
        part
      )
    ) {
      merged[merged.length - 1] += "\n" + part;
    } else {
      merged.push(part);
    }
  }

  return merged;
}

export function parseAllLabelsFromOCR(rawText: string): ParsedLabel[] {
  const labelBlocks = splitMultiLabelOCR(rawText);
  return labelBlocks.map((block) => classifyAndParseLabel(block));
}
export function getWarehouseSortBin(label: ParsedLabel): string {
  switch (label.carrierType) {
    case "USPS_SIGNATURE":
      return "BIN_USPS_SIGNATURE";
    case "USPS_HAZMAT":
      return "BIN_USPS_HAZMAT";
    case "USPS":
      return "BIN_USPS_STD";
    case "FEDEX_EVS":
      return "BIN_FEDEX_EVS";
    case "TUBT_ECO":
      return "BIN_TUBT_ECO";
    case "SPEEDX":
      return "BIN_SPEEDX";
    default:
      return "BIN_EXCEPTION";
  }
}
