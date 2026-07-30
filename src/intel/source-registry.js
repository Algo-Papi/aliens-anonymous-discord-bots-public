const SOURCE_LANES = Object.freeze({
  DISCOVERY: "discovery",
  CONFIRMATION: "confirmation",
  OFFICIAL: "official",
  CORROBORATION: "corroboration",
});

const COVERAGE_SCOPES = Object.freeze({
  US_FIRST: "us-first",
  GLOBAL_EXCEPTION: "global-exception",
});

const PUBLICATION_MODES = Object.freeze({
  CANDIDATE: "candidate",
  CORROBORATION_ONLY: "corroboration-only",
});

const EVIDENCE_QUALITIES = Object.freeze({
  AUTHORITATIVE: "authoritative",
  HIGH: "high",
  MEDIUM: "medium",
});

function source({
  key,
  label,
  family,
  lane,
  medium,
  coverage = COVERAGE_SCOPES.US_FIRST,
  publicationMode = PUBLICATION_MODES.CANDIDATE,
  evidenceQuality,
  topics,
}) {
  return Object.freeze({
    key,
    label,
    family,
    lane,
    medium,
    coverage,
    publicationMode,
    evidenceQuality,
    topics: Object.freeze([...topics]),
  });
}

/**
 * Editorial registry for Earth Intel.
 *
 * A family identifies common editorial or organizational control. Separate
 * accounts owned by the same organization deliberately share a family so they
 * cannot falsely corroborate one another.
 *
 * This registry describes policy only. URLs and credentials belong to an
 * ingestion adapter and are intentionally absent.
 */
export const EARTH_INTEL_SOURCES = Object.freeze([
  source({
    key: "bno-news",
    label: "BNO News",
    family: "bno",
    lane: SOURCE_LANES.DISCOVERY,
    medium: "x",
    coverage: COVERAGE_SCOPES.GLOBAL_EXCEPTION,
    evidenceQuality: EVIDENCE_QUALITIES.HIGH,
    topics: ["breaking-news", "public-safety", "geopolitics"],
  }),
  source({
    key: "bno-desk",
    label: "BNO News Live / Desk",
    family: "bno",
    lane: SOURCE_LANES.DISCOVERY,
    medium: "x",
    coverage: COVERAGE_SCOPES.GLOBAL_EXCEPTION,
    evidenceQuality: EVIDENCE_QUALITIES.HIGH,
    topics: ["breaking-news", "public-safety", "geopolitics"],
  }),
  source({
    key: "osintdefender",
    label: "OSINTdefender",
    family: "osintdefender",
    lane: SOURCE_LANES.DISCOVERY,
    medium: "x",
    coverage: COVERAGE_SCOPES.GLOBAL_EXCEPTION,
    evidenceQuality: EVIDENCE_QUALITIES.MEDIUM,
    topics: ["defense", "geopolitics", "breaking-news"],
  }),
  source({
    key: "faytuks",
    label: "Faytuks",
    family: "faytuks",
    lane: SOURCE_LANES.DISCOVERY,
    medium: "x",
    coverage: COVERAGE_SCOPES.GLOBAL_EXCEPTION,
    evidenceQuality: EVIDENCE_QUALITIES.MEDIUM,
    topics: ["defense", "geopolitics", "breaking-news"],
  }),
  source({
    key: "osinttechnical",
    label: "OSINTtechnical",
    family: "osinttechnical",
    lane: SOURCE_LANES.DISCOVERY,
    medium: "x",
    coverage: COVERAGE_SCOPES.GLOBAL_EXCEPTION,
    evidenceQuality: EVIDENCE_QUALITIES.MEDIUM,
    topics: ["defense", "aviation", "space"],
  }),
  source({
    key: "the-intel-frog",
    label: "TheIntelFrog",
    family: "the-intel-frog",
    lane: SOURCE_LANES.DISCOVERY,
    medium: "x",
    coverage: COVERAGE_SCOPES.GLOBAL_EXCEPTION,
    evidenceQuality: EVIDENCE_QUALITIES.MEDIUM,
    topics: ["defense", "aviation", "geopolitics"],
  }),
  source({
    key: "ap",
    label: "Associated Press",
    family: "associated-press",
    lane: SOURCE_LANES.CONFIRMATION,
    medium: "newswire",
    coverage: COVERAGE_SCOPES.GLOBAL_EXCEPTION,
    evidenceQuality: EVIDENCE_QUALITIES.HIGH,
    topics: ["breaking-news", "government", "public-safety"],
  }),
  source({
    key: "reuters",
    label: "Reuters",
    family: "reuters",
    lane: SOURCE_LANES.CONFIRMATION,
    medium: "newswire",
    coverage: COVERAGE_SCOPES.GLOBAL_EXCEPTION,
    evidenceQuality: EVIDENCE_QUALITIES.HIGH,
    topics: ["breaking-news", "government", "economy", "geopolitics"],
  }),
  source({
    key: "bbc-breaking",
    label: "BBC Breaking News",
    family: "bbc",
    lane: SOURCE_LANES.CONFIRMATION,
    medium: "news",
    coverage: COVERAGE_SCOPES.GLOBAL_EXCEPTION,
    evidenceQuality: EVIDENCE_QUALITIES.HIGH,
    topics: ["breaking-news", "public-safety", "geopolitics"],
  }),
  source({
    key: "nws",
    label: "National Weather Service",
    family: "noaa",
    lane: SOURCE_LANES.OFFICIAL,
    medium: "official-feed",
    evidenceQuality: EVIDENCE_QUALITIES.AUTHORITATIVE,
    topics: ["weather", "public-safety"],
  }),
  source({
    key: "nhc",
    label: "National Hurricane Center",
    family: "noaa",
    lane: SOURCE_LANES.OFFICIAL,
    medium: "official-feed",
    evidenceQuality: EVIDENCE_QUALITIES.AUTHORITATIVE,
    topics: ["hurricanes", "weather", "public-safety"],
  }),
  source({
    key: "usgs",
    label: "U.S. Geological Survey",
    family: "usgs",
    lane: SOURCE_LANES.OFFICIAL,
    medium: "official-api",
    evidenceQuality: EVIDENCE_QUALITIES.AUTHORITATIVE,
    topics: ["earthquakes", "volcanoes", "public-safety"],
  }),
  source({
    key: "faa",
    label: "Federal Aviation Administration",
    family: "faa",
    lane: SOURCE_LANES.OFFICIAL,
    medium: "official-feed",
    evidenceQuality: EVIDENCE_QUALITIES.AUTHORITATIVE,
    topics: ["aviation", "infrastructure", "public-safety"],
  }),
  source({
    key: "cisa",
    label: "Cybersecurity and Infrastructure Security Agency",
    family: "cisa",
    lane: SOURCE_LANES.OFFICIAL,
    medium: "official-feed",
    evidenceQuality: EVIDENCE_QUALITIES.AUTHORITATIVE,
    topics: ["cybersecurity", "infrastructure"],
  }),
  source({
    key: "cdc",
    label: "Centers for Disease Control and Prevention",
    family: "cdc",
    lane: SOURCE_LANES.OFFICIAL,
    medium: "official-feed",
    evidenceQuality: EVIDENCE_QUALITIES.AUTHORITATIVE,
    topics: ["health", "public-safety"],
  }),
  source({
    key: "fema",
    label: "Federal Emergency Management Agency",
    family: "fema",
    lane: SOURCE_LANES.OFFICIAL,
    medium: "official-api",
    evidenceQuality: EVIDENCE_QUALITIES.AUTHORITATIVE,
    topics: ["disasters", "government", "public-safety"],
  }),
  source({
    key: "noaa-space-weather",
    label: "NOAA Space Weather Prediction Center",
    family: "noaa",
    lane: SOURCE_LANES.OFFICIAL,
    medium: "official-feed",
    evidenceQuality: EVIDENCE_QUALITIES.AUTHORITATIVE,
    topics: ["space-weather", "infrastructure", "space"],
  }),
  source({
    key: "state-department",
    label: "U.S. Department of State",
    family: "state-department",
    lane: SOURCE_LANES.OFFICIAL,
    medium: "official-feed",
    evidenceQuality: EVIDENCE_QUALITIES.AUTHORITATIVE,
    topics: ["government", "diplomacy", "geopolitics"],
  }),
  source({
    key: "dod",
    label: "U.S. Department of Defense",
    family: "department-of-defense",
    lane: SOURCE_LANES.OFFICIAL,
    medium: "official-feed",
    evidenceQuality: EVIDENCE_QUALITIES.AUTHORITATIVE,
    topics: ["defense", "government", "geopolitics"],
  }),
  source({
    key: "centcom",
    label: "U.S. Central Command",
    family: "department-of-defense",
    lane: SOURCE_LANES.OFFICIAL,
    medium: "official-feed",
    coverage: COVERAGE_SCOPES.GLOBAL_EXCEPTION,
    evidenceQuality: EVIDENCE_QUALITIES.AUTHORITATIVE,
    topics: ["defense", "government", "geopolitics"],
  }),
  source({
    key: "white-house",
    label: "The White House",
    family: "white-house",
    lane: SOURCE_LANES.OFFICIAL,
    medium: "official-feed",
    evidenceQuality: EVIDENCE_QUALITIES.AUTHORITATIVE,
    topics: ["government", "public-policy"],
  }),
  source({
    key: "federal-reserve",
    label: "Federal Reserve",
    family: "federal-reserve",
    lane: SOURCE_LANES.OFFICIAL,
    medium: "official-feed",
    evidenceQuality: EVIDENCE_QUALITIES.AUTHORITATIVE,
    topics: ["economy", "government"],
  }),
  source({
    key: "bls",
    label: "U.S. Bureau of Labor Statistics",
    family: "bls",
    lane: SOURCE_LANES.OFFICIAL,
    medium: "official-feed",
    evidenceQuality: EVIDENCE_QUALITIES.AUTHORITATIVE,
    topics: ["economy", "government"],
  }),
  source({
    key: "nasa",
    label: "NASA",
    family: "nasa",
    lane: SOURCE_LANES.OFFICIAL,
    medium: "official-feed",
    evidenceQuality: EVIDENCE_QUALITIES.AUTHORITATIVE,
    topics: ["space", "science", "uap"],
  }),
  source({
    key: "gdacs",
    label: "Global Disaster Alert and Coordination System",
    family: "gdacs",
    lane: SOURCE_LANES.CORROBORATION,
    medium: "official-feed",
    coverage: COVERAGE_SCOPES.GLOBAL_EXCEPTION,
    publicationMode: PUBLICATION_MODES.CORROBORATION_ONLY,
    evidenceQuality: EVIDENCE_QUALITIES.HIGH,
    topics: ["disasters", "public-safety"],
  }),
  source({
    key: "who",
    label: "World Health Organization",
    family: "world-health-organization",
    lane: SOURCE_LANES.CORROBORATION,
    medium: "official-feed",
    coverage: COVERAGE_SCOPES.GLOBAL_EXCEPTION,
    publicationMode: PUBLICATION_MODES.CORROBORATION_ONLY,
    evidenceQuality: EVIDENCE_QUALITIES.AUTHORITATIVE,
    topics: ["health", "public-safety"],
  }),
  source({
    key: "reliefweb",
    label: "ReliefWeb / UN OCHA",
    family: "un-ocha",
    lane: SOURCE_LANES.CORROBORATION,
    medium: "official-feed",
    coverage: COVERAGE_SCOPES.GLOBAL_EXCEPTION,
    publicationMode: PUBLICATION_MODES.CORROBORATION_ONLY,
    evidenceQuality: EVIDENCE_QUALITIES.HIGH,
    topics: ["disasters", "humanitarian"],
  }),
]);

const SOURCE_INDEX = new Map(
  EARTH_INTEL_SOURCES.map((entry) => [entry.key, entry]),
);

if (SOURCE_INDEX.size !== EARTH_INTEL_SOURCES.length) {
  throw new Error("Earth Intel source keys must be unique.");
}

export function getIntelSource(key) {
  return SOURCE_INDEX.get(String(key ?? "").trim()) ?? null;
}

export function getSourceFamily(key) {
  return getIntelSource(key)?.family ?? null;
}

export {
  COVERAGE_SCOPES,
  EVIDENCE_QUALITIES,
  PUBLICATION_MODES,
  SOURCE_LANES,
};
