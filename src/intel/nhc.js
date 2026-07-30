import {
  createOfficialCandidate,
  truncateText,
} from "./candidate.js";
import { requestJson } from "./http.js";
import {
  isInUnitedStatesImpactCorridor,
  usImpactArea,
} from "./us-geography.js";

export const NHC_CURRENT_STORMS_URL =
  "https://www.nhc.noaa.gov/CurrentStorms.json";

const CLASSIFICATION_NAMES = Object.freeze({
  TD: "Tropical Depression",
  STD: "Subtropical Depression",
  TS: "Tropical Storm",
  HU: "Hurricane",
  STS: "Subtropical Storm",
  PTC: "Post-tropical Cyclone",
  TY: "Typhoon",
  PC: "Potential Tropical Cyclone",
});

function stormCoordinates(storm) {
  return {
    latitude: Number(storm.latitudeNumeric ?? storm.latitude_numeric),
    longitude: Number(storm.longitudeNumeric ?? storm.longitude_numeric),
  };
}

function basinCode(storm) {
  return String(storm.id ?? "").slice(0, 2).toLowerCase();
}

function basinLabel(storm) {
  if (String(storm.binNumber ?? "").startsWith("CP")) {
    return "Central Pacific";
  }
  switch (basinCode(storm)) {
    case "al":
      return "Atlantic, Caribbean, and Gulf";
    case "ep":
      return "Eastern Pacific";
    case "cp":
      return "Central Pacific";
    default:
      return "NHC/CPHC area";
  }
}

function isWesternAtlanticCorridor(storm) {
  const { latitude, longitude } = stormCoordinates(storm);
  return (
    basinCode(storm) === "al" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= 8 &&
    latitude <= 50 &&
    longitude <= -50
  );
}

function isCentralPacificStorm(storm) {
  return (
    basinCode(storm) === "cp" ||
    String(storm.binNumber ?? "").startsWith("CP")
  );
}

function hasWatchOrWarningProducts(storm) {
  return Boolean(
    storm.windWatchesWarnings ||
      storm.stormSurgeWatchWarningGIS ||
      storm.peakSurgeKML,
  );
}

/**
 * Conservative U.S.-first gate. It excludes ordinary open-ocean systems and
 * Eastern Pacific storms far from a U.S. impact corridor.
 */
export function isHighImpactNhcStorm(storm) {
  const intensityKnots = Number(storm?.intensity);
  if (!storm?.id || !Number.isFinite(intensityKnots)) {
    return false;
  }

  const { latitude, longitude } = stormCoordinates(storm);
  const nearUnitedStates = isInUnitedStatesImpactCorridor(
    latitude,
    longitude,
  );
  if (nearUnitedStates && intensityKnots >= 34) {
    return true;
  }
  if (isCentralPacificStorm(storm) && intensityKnots >= 34) {
    return true;
  }
  if (isWesternAtlanticCorridor(storm) && intensityKnots >= 64) {
    return true;
  }
  return (
    hasWatchOrWarningProducts(storm) &&
    (nearUnitedStates ||
      isCentralPacificStorm(storm) ||
      isWesternAtlanticCorridor(storm))
  );
}

function hurricaneCategory(intensityKnots) {
  if (intensityKnots >= 137) {
    return 5;
  }
  if (intensityKnots >= 113) {
    return 4;
  }
  if (intensityKnots >= 96) {
    return 3;
  }
  if (intensityKnots >= 83) {
    return 2;
  }
  if (intensityKnots >= 64) {
    return 1;
  }
  return null;
}

function stormSeverity(storm) {
  const intensityKnots = Number(storm.intensity);
  const category = hurricaneCategory(intensityKnots);
  if (category !== null && category >= 3) {
    return { rank: 5, label: `Major hurricane (Category ${category})` };
  }
  if (category !== null) {
    return { rank: 4, label: `Hurricane (Category ${category})` };
  }
  if (hasWatchOrWarningProducts(storm)) {
    return { rank: 4, label: "Tropical cyclone watches/warnings active" };
  }
  return { rank: 3, label: "U.S.-relevant tropical cyclone" };
}

function compassDirection(degrees) {
  if (!Number.isFinite(degrees)) {
    return null;
  }
  const points = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ];
  return points[Math.round((((degrees % 360) + 360) % 360) / 22.5) % 16];
}

export function normalizeNhcStorm(storm) {
  const classification =
    CLASSIFICATION_NAMES[storm.classification] ??
    String(storm.classification ?? "Tropical Cyclone");
  const intensityKnots = Number(storm.intensity);
  const category = hurricaneCategory(intensityKnots);
  const severity = stormSeverity(storm);
  const { latitude, longitude } = stormCoordinates(storm);
  const impactArea = usImpactArea(latitude, longitude);
  const advisory = storm.publicAdvisory ?? storm.forecastAdvisory ?? {};
  const movementDirection = compassDirection(Number(storm.movementDir));
  const movementSpeed = Number(storm.movementSpeed);
  const movement =
    movementDirection && Number.isFinite(movementSpeed)
      ? ` Moving ${movementDirection} at ${movementSpeed} mph.`
      : "";
  const categoryPrefix =
    category === null ? classification : `Category ${category} Hurricane`;
  const name = String(storm.name ?? storm.id).trim();

  return createOfficialCandidate({
    sourceKey: "nhc",
    sourceLabel: "National Hurricane Center",
    authority: "NOAA / NHC and CPHC",
    eventId: storm.id,
    versionToken: advisory.advNum ?? storm.lastUpdate,
    eventType: "tropical_cyclone",
    title: `${categoryPrefix} ${name} — ${intensityKnots} kt`,
    summary: truncateText(
      `${classification} ${name} is centered near ${storm.latitude ?? latitude}, ${storm.longitude ?? longitude} with maximum sustained winds of ${intensityKnots} kt.${movement}`,
      1_000,
    ),
    url:
      advisory.url ??
      storm.forecastGraphics?.url ??
      "https://www.nhc.noaa.gov/",
    publishedAt: advisory.issuance ?? storm.lastUpdate,
    updatedAt: storm.lastUpdate ?? advisory.issuance,
    severityRank: severity.rank,
    severityLabel: severity.label,
    geography: {
      scope: "us-interest",
      countryCode: impactArea ? "US" : null,
      areas: [impactArea, basinLabel(storm)].filter(Boolean),
      coordinates: { latitude, longitude },
    },
    tags: [
      "official",
      "tropical-cyclone",
      storm.classification,
      category !== null ? `category-${category}` : "",
      hasWatchOrWarningProducts(storm) ? "watch-warning-product" : "",
    ],
    metadata: {
      stormId: storm.id,
      advisoryNumber: advisory.advNum ?? null,
      classification: storm.classification ?? null,
      intensityKnots,
      pressureMillibars: Number(storm.pressure) || null,
      movementDirectionDegrees: Number(storm.movementDir) || null,
      movementSpeedMph: Number.isFinite(movementSpeed)
        ? movementSpeed
        : null,
      hasWindWatchesWarnings: Boolean(storm.windWatchesWarnings),
      hasStormSurgeWatchWarning: Boolean(
        storm.stormSurgeWatchWarningGIS,
      ),
      usRelevance: "conservative-location-heuristic",
    },
  });
}

export function parseNhcCurrentStorms(
  data,
  { include = isHighImpactNhcStorm } = {},
) {
  if (!data || !Array.isArray(data.activeStorms)) {
    throw new TypeError(
      "NHC current-storm response did not contain activeStorms.",
    );
  }
  return data.activeStorms
    .filter((storm) => include(storm))
    .map(normalizeNhcStorm)
    .sort((left, right) => left.publishedAtMs - right.publishedAtMs);
}

export async function fetchNhcCurrentStorms({
  url = NHC_CURRENT_STORMS_URL,
  fetchImpl,
  signal,
  timeoutMs,
  maximumBytes = 2 * 1024 * 1024,
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
      Accept: "application/json",
      "User-Agent": "AliensAnonymousDiscord/0.1 official-intel-monitor",
    },
  });
  return Object.freeze({
    notModified: response.notModified,
    validators: response.validators,
    candidates: response.notModified
      ? Object.freeze([])
      : Object.freeze(parseNhcCurrentStorms(response.data, { include })),
  });
}
