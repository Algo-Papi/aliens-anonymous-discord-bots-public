import {
  collapseWhitespace,
  createOfficialCandidate,
  truncateText,
} from "./candidate.js";
import { requestJson } from "./http.js";

export const SWPC_ALERTS_URL =
  "https://services.swpc.noaa.gov/products/alerts.json";
export const SWPC_ALERTS_PAGE_URL =
  "https://www.spaceweather.gov/products/alerts-watches-and-warnings";

const SCALE_NAMES = Object.freeze({
  G: "Geomagnetic Storm",
  R: "Radio Blackout",
  S: "Solar Radiation Storm",
});

const SCALE_DESCRIPTIONS = Object.freeze({
  1: "Minor",
  2: "Moderate",
  3: "Strong",
  4: "Severe",
  5: "Extreme",
});

function utcTimestamp(value) {
  const text = String(value ?? "").trim();
  if (!text) {
    return 0;
  }
  const explicitZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(text);
  return Date.parse(explicitZone ? text : `${text.replace(" ", "T")}Z`);
}

export function extractSwpcScales(message) {
  const scales = [];
  const expression = /\b([GRS])\s*([1-5])\b/gi;
  for (const match of String(message ?? "").matchAll(expression)) {
    scales.push({
      family: match[1].toUpperCase(),
      value: Number(match[2]),
    });
  }
  return scales;
}

function strongestScale(message) {
  return extractSwpcScales(message).sort(
    (left, right) => right.value - left.value,
  )[0] ?? null;
}

function fieldValue(message, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return (
    String(message ?? "").match(
      new RegExp(`^${escaped}:\\s*(.+)$`, "im"),
    )?.[1]?.trim() ?? null
  );
}

function alertHeadline(message) {
  const lines = String(message ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return (
    lines.find((line) =>
      /^(?:(?:CONTINUED|EXTENDED|CANCEL)\s+)?(?:ALERT|WARNING|WATCH):/i.test(
        line,
      ),
    ) ??
    lines.find((line) => /^NOAA SCALE:/i.test(line)) ??
    "High-impact space weather alert"
  );
}

function impactText(message) {
  const normalized = String(message ?? "").replace(/\r\n/g, "\n");
  const marker = normalized.search(/Potential Impacts?:/i);
  return marker >= 0
    ? normalized.slice(marker)
    : normalized;
}

export function isHighImpactSwpcAlert(record, minimumScale = 3) {
  const scale = strongestScale(record?.message);
  return Boolean(scale && scale.value >= minimumScale);
}

export function normalizeSwpcAlert(record) {
  const message = String(record.message ?? "");
  const scale = strongestScale(message);
  const serial = fieldValue(message, "Serial Number");
  const messageCode = fieldValue(message, "Space Weather Message Code");
  const issuedAt = utcTimestamp(record.issue_datetime);
  const lifecycleStatus = /\bCANCEL(?:LED)?\b/i.test(message)
    ? "cancelled"
    : /\bCONTINUED\b/i.test(message)
      ? "continued"
      : /\bEXTENDED\b/i.test(message)
        ? "extended"
        : "issued";
  const scaleLabel = `${scale.family}${scale.value} — ${SCALE_DESCRIPTIONS[scale.value]}`;
  const headline = alertHeadline(message);
  const eventId = [
    record.product_id || messageCode || scale.family,
    serial || String(issuedAt),
  ].join(":");

  return createOfficialCandidate({
    sourceKey: "noaa-space-weather",
    sourceLabel: "NOAA Space Weather Prediction Center",
    authority: "NOAA / Space Weather Prediction Center",
    eventId,
    versionToken: record.issue_datetime,
    eventType: `space_weather_${SCALE_NAMES[scale.family]
      .toLowerCase()
      .replace(/\s+/g, "_")}`,
    title: `${scale.family}${scale.value} ${SCALE_NAMES[scale.family]} — ${collapseWhitespace(headline.replace(/^.*?:\s*/, ""))}`,
    summary: truncateText(impactText(message), 1_200),
    url: SWPC_ALERTS_PAGE_URL,
    publishedAt: issuedAt,
    updatedAt: issuedAt,
    severityRank: scale.value >= 4 ? 5 : 4,
    severityLabel: scaleLabel,
    geography: {
      scope: "us-and-global",
      countryCode: "US",
      areas: ["United States", "Near-Earth space"],
    },
    tags: [
      "official",
      "space-weather",
      scale.family,
      `${scale.family}${scale.value}`,
      lifecycleStatus,
    ],
    metadata: {
      productId: record.product_id ?? null,
      messageCode,
      serial,
      scaleFamily: scale.family,
      scaleValue: scale.value,
      lifecycleStatus,
    },
  });
}

export function parseSwpcHighImpactAlerts(
  data,
  { minimumScale = 3 } = {},
) {
  if (!Array.isArray(data)) {
    throw new TypeError("NOAA SWPC alerts response was not an array.");
  }
  return data
    .filter(
      (record) =>
        record?.message &&
        record?.issue_datetime &&
        isHighImpactSwpcAlert(record, minimumScale),
    )
    .map(normalizeSwpcAlert)
    .sort((left, right) => left.publishedAtMs - right.publishedAtMs);
}

export async function fetchSwpcHighImpactAlerts({
  url = SWPC_ALERTS_URL,
  fetchImpl,
  signal,
  timeoutMs,
  maximumBytes = 3 * 1024 * 1024,
  validators,
  onValidators,
  minimumScale = 3,
} = {}) {
  const response = await requestJson(url, {
    fetchImpl,
    signal,
    timeoutMs,
    maximumBytes,
    validators,
    onValidators,
    headers: {
      Accept: "application/json",
      "User-Agent": "AliensAnonymousDiscord/0.1 official-intel-monitor",
    },
  });
  return Object.freeze({
    notModified: response.notModified,
    validators: response.validators,
    candidates: response.notModified
      ? Object.freeze([])
      : Object.freeze(
          parseSwpcHighImpactAlerts(response.data, { minimumScale }),
        ),
  });
}
