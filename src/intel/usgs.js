import {
  createOfficialCandidate,
  truncateText,
} from "./candidate.js";
import { requestJson } from "./http.js";
import {
  isInUnitedStatesImpactCorridor,
  usImpactArea,
} from "./us-geography.js";

export const USGS_SIGNIFICANT_WEEK_URL =
  "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_week.geojson";

function earthquakeValues(feature) {
  const properties = feature?.properties ?? {};
  const coordinates = feature?.geometry?.coordinates ?? [];
  return {
    magnitude: Number(properties.mag),
    longitude: Number(coordinates[0]),
    latitude: Number(coordinates[1]),
    depthKm: Number(coordinates[2]),
    alert: String(properties.alert ?? "").toLowerCase(),
    tsunami: Number(properties.tsunami) === 1,
  };
}

export function shouldIncludeUsgsEarthquake(feature) {
  const {
    magnitude,
    latitude,
    longitude,
    alert,
    tsunami,
  } = earthquakeValues(feature);
  if (!Number.isFinite(magnitude)) {
    return false;
  }

  const nearUnitedStates = isInUnitedStatesImpactCorridor(
    latitude,
    longitude,
  );
  return (
    magnitude >= 7 ||
    (nearUnitedStates && magnitude >= 5) ||
    (tsunami && magnitude >= 6.5) ||
    alert === "red" ||
    alert === "orange"
  );
}

function earthquakeSeverity(feature) {
  const { magnitude, alert, tsunami } = earthquakeValues(feature);
  if (alert === "red" || magnitude >= 8) {
    return { rank: 5, label: alert === "red" ? "USGS red alert" : "M8+" };
  }
  if (
    alert === "orange" ||
    tsunami ||
    magnitude >= 7
  ) {
    return {
      rank: 4,
      label:
        alert === "orange"
          ? "USGS orange alert"
          : tsunami
            ? "Tsunami flag set"
            : "M7+",
    };
  }
  return { rank: 3, label: "Significant U.S.-impact earthquake" };
}

function magnitudeText(magnitude) {
  return Number.isInteger(magnitude)
    ? magnitude.toFixed(1)
    : String(magnitude);
}

export function normalizeUsgsEarthquake(feature) {
  const properties = feature.properties ?? {};
  const {
    magnitude,
    latitude,
    longitude,
    depthKm,
    alert,
    tsunami,
  } = earthquakeValues(feature);
  const area = usImpactArea(latitude, longitude);
  const place = String(properties.place ?? "location pending");
  const severity = earthquakeSeverity(feature);
  const details = [
    `USGS reports a magnitude ${magnitudeText(magnitude)} earthquake near ${place}.`,
  ];
  if (Number.isFinite(depthKm)) {
    details.push(`Depth: ${depthKm.toFixed(1)} km.`);
  }
  if (tsunami) {
    details.push(
      "The USGS event record carries a tsunami flag; consult tsunami authorities for warning status.",
    );
  }

  return createOfficialCandidate({
    sourceKey: "usgs",
    sourceLabel: "USGS Earthquake Hazards Program",
    authority: "U.S. Geological Survey",
    eventId: feature.id,
    versionToken: properties.updated,
    eventType: "earthquake",
    title: `M${magnitudeText(magnitude)} earthquake — ${place}`,
    summary: truncateText(details.join(" "), 1_000),
    url: properties.url,
    publishedAt: properties.time,
    updatedAt: properties.updated,
    severityRank: severity.rank,
    severityLabel: severity.label,
    geography: {
      scope: area ? "us-impact" : "global-major",
      countryCode: area ? "US" : null,
      areas: area ? [area, place] : [place],
      coordinates: { latitude, longitude },
    },
    tags: [
      "official",
      "earthquake",
      area ? "us-impact" : "global-major",
      tsunami ? "tsunami-signal" : "",
    ],
    metadata: {
      magnitude,
      depthKm: Number.isFinite(depthKm) ? depthKm : null,
      significance: Number(properties.sig) || 0,
      alert: alert || null,
      tsunami,
      feltReports: Number(properties.felt) || 0,
      status: properties.status ?? null,
    },
  });
}

export function parseUsgsSignificantEarthquakes(
  data,
  { include = shouldIncludeUsgsEarthquake } = {},
) {
  if (
    data?.type !== "FeatureCollection" ||
    !Array.isArray(data.features)
  ) {
    throw new TypeError("USGS feed was not a GeoJSON FeatureCollection.");
  }

  return data.features
    .filter(
      (feature) =>
        feature?.id &&
        feature?.properties?.url &&
        include(feature),
    )
    .map(normalizeUsgsEarthquake)
    .sort((left, right) => left.publishedAtMs - right.publishedAtMs);
}

export async function fetchUsgsSignificantEarthquakes({
  url = USGS_SIGNIFICANT_WEEK_URL,
  fetchImpl,
  signal,
  timeoutMs,
  maximumBytes = 3 * 1024 * 1024,
  validators,
  onValidators,
  include,
} = {}) {
  const response = await requestJson(url, {
    fetchImpl,
    signal,
    timeoutMs,
    maximumBytes,
    validators,
    onValidators,
    headers: {
      Accept: "application/geo+json, application/json;q=0.9",
      "User-Agent": "AliensAnonymousDiscord/0.1 official-intel-monitor",
    },
  });
  return Object.freeze({
    notModified: response.notModified,
    validators: response.validators,
    candidates: response.notModified
      ? Object.freeze([])
      : Object.freeze(
          parseUsgsSignificantEarthquakes(response.data, { include }),
        ),
  });
}
