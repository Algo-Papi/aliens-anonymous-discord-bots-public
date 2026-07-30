import {
  fetchNhcCurrentStorms,
  fetchNwsHighImpactAlerts,
  fetchSwpcHighImpactAlerts,
  fetchUsgsSignificantEarthquakes,
} from "./official-feeds.js";

const MINUTE = 60_000;

function social({ key, label, handle, intervalMs = 5 * MINUTE }) {
  return Object.freeze({
    key,
    label,
    handle,
    kind: "social",
    intervalMs,
  });
}

function official({
  key,
  label,
  fetchCandidates,
  intervalMs = 2 * MINUTE,
}) {
  return Object.freeze({
    key,
    label,
    kind: "official",
    intervalMs,
    fetchCandidates,
  });
}

/**
 * Active v1 sources only. The broader editorial registry intentionally contains
 * later corroboration options, but this list is the exact live/pinned roster.
 */
export const EARTH_INTEL_RUNTIME_SOURCES = Object.freeze([
  social({
    key: "bno-news",
    label: "BNO News",
    handle: "BNONews",
  }),
  social({
    key: "bno-desk",
    label: "BNO News Live / Desk",
    handle: "BNODesk",
  }),
  social({
    key: "osintdefender",
    label: "OSINTdefender",
    handle: "sentdefender",
  }),
  social({
    key: "faytuks",
    label: "Faytuks",
    handle: "Faytuks",
  }),
  social({
    key: "osinttechnical",
    label: "OSINTtechnical",
    handle: "Osinttechnical",
  }),
  social({
    key: "the-intel-frog",
    label: "TheIntelFrog",
    handle: "TheIntelFrog",
  }),
  social({
    key: "ap",
    label: "Associated Press",
    handle: "AP",
  }),
  social({
    key: "reuters",
    label: "Reuters",
    handle: "Reuters",
  }),
  social({
    key: "bbc-breaking",
    label: "BBC Breaking News",
    handle: "BBCBreaking",
  }),
  official({
    key: "usgs",
    label: "USGS Significant Earthquakes",
    fetchCandidates: fetchUsgsSignificantEarthquakes,
  }),
  official({
    key: "nws",
    label: "NWS High-Impact Alerts",
    fetchCandidates: fetchNwsHighImpactAlerts,
  }),
  official({
    key: "nhc",
    label: "National Hurricane Center",
    intervalMs: 5 * MINUTE,
    fetchCandidates: fetchNhcCurrentStorms,
  }),
  official({
    key: "noaa-space-weather",
    label: "NOAA Space Weather (G3/R3/S3+)",
    fetchCandidates: fetchSwpcHighImpactAlerts,
  }),
]);

export function getRuntimeIntelSource(key) {
  return (
    EARTH_INTEL_RUNTIME_SOURCES.find((source) => source.key === key) ??
    null
  );
}
