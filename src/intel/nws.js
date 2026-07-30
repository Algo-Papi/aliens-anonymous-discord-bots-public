import {
  collapseWhitespace,
  createOfficialCandidate,
  truncateText,
  uniqueStrings,
} from "./candidate.js";
import { requestJson } from "./http.js";

export const NWS_HIGH_IMPACT_ALERTS_URL =
  "https://api.weather.gov/alerts/active?status=actual";

export const NWS_ALWAYS_INCLUDE_EVENTS = Object.freeze(
  new Set([
    "Earthquake Warning",
    "Extreme Wind Warning",
    "Hurricane Warning",
    "Nuclear Power Plant Warning",
    "Radiological Hazard Warning",
    "Storm Surge Warning",
    "Tsunami Warning",
    "Volcano Warning",
  ]),
);

const HIGH_END_LANGUAGE =
  /\b(?:TORNADO EMERGENCY|FLASH FLOOD EMERGENCY|PARTICULARLY DANGEROUS SITUATION|CATASTROPHIC DAMAGE THREAT|DESTRUCTIVE DAMAGE THREAT)\b/i;

function parameterText(parameters, name) {
  const value = parameters?.[name];
  if (Array.isArray(value)) {
    return value.join(" ");
  }
  return String(value ?? "");
}

function alertLanguage(properties) {
  return [
    properties.headline,
    properties.event,
    properties.description,
    parameterText(properties.parameters, "NWSheadline"),
    parameterText(properties.parameters, "eventEndingTime"),
  ].join(" ");
}

export function isHighImpactNwsAlert(feature) {
  const properties = feature?.properties ?? {};
  if (
    properties.status &&
    String(properties.status).toLowerCase() !== "actual"
  ) {
    return false;
  }

  const event = String(properties.event ?? "");
  const hasHighEndLanguage = HIGH_END_LANGUAGE.test(
    alertLanguage(properties),
  );
  if (
    event === "Tornado Warning" ||
    event === "Flash Flood Warning" ||
    event === "Severe Thunderstorm Warning"
  ) {
    return hasHighEndLanguage;
  }
  return NWS_ALWAYS_INCLUDE_EVENTS.has(event) || hasHighEndLanguage;
}

function nwsSeverity(properties) {
  if (HIGH_END_LANGUAGE.test(alertLanguage(properties))) {
    return { rank: 5, label: "Emergency/PDS language" };
  }
  switch (properties.severity) {
    case "Extreme":
      return { rank: 5, label: "NWS Extreme" };
    case "Severe":
      return { rank: 4, label: "NWS Severe" };
    default:
      return { rank: 3, label: `NWS ${properties.severity ?? "High impact"}` };
  }
}

function alertAreas(areaDescription) {
  return uniqueStrings(
    String(areaDescription ?? "")
      .split(";")
      .map((area) => area.trim()),
  );
}

export function normalizeNwsAlert(feature) {
  const properties = feature.properties ?? {};
  const severity = nwsSeverity(properties);
  const areas = alertAreas(properties.areaDesc);
  const event = collapseWhitespace(properties.event) || "NWS alert";
  const headline =
    collapseWhitespace(properties.headline) ||
    `${event}${areas.length ? ` for ${areas.join(", ")}` : ""}`;
  const eventId =
    feature.id ?? properties.id ?? properties["@id"];
  const url =
    properties.web ??
    (typeof eventId === "string" && /^https?:\/\//.test(eventId)
      ? eventId
      : "https://www.weather.gov/alerts");
  const sent = properties.sent ?? properties.effective ?? properties.onset;

  return createOfficialCandidate({
    sourceKey: "nws",
    sourceLabel: "National Weather Service",
    authority: "NOAA / National Weather Service",
    eventId,
    versionToken: sent,
    eventType: `weather_${event.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
    title: headline,
    summary: truncateText(properties.description ?? headline, 1_200),
    url,
    publishedAt: sent,
    updatedAt: sent,
    endsAt: properties.ends ?? properties.expires ?? null,
    severityRank: severity.rank,
    severityLabel: severity.label,
    geography: {
      scope: "us-impact",
      countryCode: "US",
      areas,
    },
    tags: [
      "official",
      "weather",
      event,
      HIGH_END_LANGUAGE.test(alertLanguage(properties))
        ? "high-end-language"
        : "",
    ],
    metadata: {
      event,
      senderName: properties.senderName ?? null,
      status: properties.status ?? null,
      messageType: properties.messageType ?? null,
      urgency: properties.urgency ?? null,
      certainty: properties.certainty ?? null,
      effective: properties.effective ?? null,
      onset: properties.onset ?? null,
      expires: properties.expires ?? null,
      instruction: truncateText(properties.instruction, 1_000) || null,
    },
  });
}

export function parseNwsHighImpactAlerts(
  data,
  { include = isHighImpactNwsAlert } = {},
) {
  if (
    data?.type !== "FeatureCollection" ||
    !Array.isArray(data.features)
  ) {
    throw new TypeError("NWS alerts response was not a FeatureCollection.");
  }

  return data.features
    .filter((feature) => {
      const eventId =
        feature?.id ??
        feature?.properties?.id ??
        feature?.properties?.["@id"];
      return eventId && include(feature);
    })
    .map(normalizeNwsAlert)
    .sort((left, right) => left.publishedAtMs - right.publishedAtMs);
}

export async function fetchNwsHighImpactAlerts({
  url = NWS_HIGH_IMPACT_ALERTS_URL,
  fetchImpl,
  signal,
  timeoutMs,
  maximumBytes = 8 * 1024 * 1024,
  validators,
  onValidators,
  include,
  userAgent = "AliensAnonymousDiscord/0.1 official-intel-monitor",
} = {}) {
  const response = await requestJson(url, {
    fetchImpl,
    signal,
    timeoutMs,
    maximumBytes,
    validators,
    onValidators,
    headers: {
      Accept: "application/geo+json, application/ld+json;q=0.9",
      "User-Agent": userAgent,
    },
  });
  return Object.freeze({
    notModified: response.notModified,
    validators: response.validators,
    candidates: response.notModified
      ? Object.freeze([])
      : Object.freeze(parseNwsHighImpactAlerts(response.data, { include })),
  });
}
