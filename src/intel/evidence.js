import {
  EVIDENCE_QUALITIES,
  SOURCE_LANES,
  getIntelSource,
} from "./source-registry.js";

export const RELIABILITY_LABELS = Object.freeze({
  EARLY_REPORT: "early-report",
  DEVELOPING: "developing",
  CORROBORATED: "corroborated",
  CONFIRMED: "confirmed",
  OFFICIAL_CLAIM: "official-claim",
  CORRECTED: "corrected",
  DISPUTED: "disputed",
});

export const EVIDENCE_POSITIONS = Object.freeze({
  SUPPORTS: "supports",
  DISPUTES: "disputes",
  CORRECTS: "corrects",
});

const QUALITY_RANK = Object.freeze({
  [EVIDENCE_QUALITIES.MEDIUM]: 1,
  [EVIDENCE_QUALITIES.HIGH]: 2,
  [EVIDENCE_QUALITIES.AUTHORITATIVE]: 3,
});

function normalizedPosition(value) {
  return Object.values(EVIDENCE_POSITIONS).includes(value)
    ? value
    : EVIDENCE_POSITIONS.SUPPORTS;
}

function evidenceDetails(observation) {
  const source = getIntelSource(observation.sourceKey);
  const family = String(
    observation.originFamily ??
      observation.family ??
      source?.family ??
      `unregistered:${observation.sourceKey ?? "anonymous"}`,
  )
    .trim()
    .toLowerCase();
  const quality = Object.hasOwn(
    QUALITY_RANK,
    observation.quality,
  )
    ? observation.quality
    : source?.evidenceQuality ?? EVIDENCE_QUALITIES.MEDIUM;

  return {
    family,
    position: normalizedPosition(observation.position),
    quality,
    official:
      observation.official === true ||
      source?.lane === SOURCE_LANES.OFFICIAL ||
      source?.evidenceQuality ===
        EVIDENCE_QUALITIES.AUTHORITATIVE,
  };
}

function bestFamilyEvidence(observations, position) {
  const families = new Map();
  for (const observation of observations) {
    const details = evidenceDetails(observation);
    if (details.position !== position) {
      continue;
    }
    const previous = families.get(details.family);
    if (
      !previous ||
      QUALITY_RANK[details.quality] > QUALITY_RANK[previous.quality]
    ) {
      families.set(details.family, details);
    } else if (details.official) {
      previous.official = true;
    }
  }
  return families;
}

/**
 * Assigns an evidence label using independent source families rather than raw
 * account or item counts.
 */
export function assessReliability(observations = [], options = {}) {
  const safeObservations = Array.isArray(observations)
    ? observations.filter(
        (observation) =>
          observation && typeof observation === "object",
      )
    : [];
  const support = bestFamilyEvidence(
    safeObservations,
    EVIDENCE_POSITIONS.SUPPORTS,
  );
  const disputes = bestFamilyEvidence(
    safeObservations,
    EVIDENCE_POSITIONS.DISPUTES,
  );
  const correctionFamilies = bestFamilyEvidence(
    safeObservations,
    EVIDENCE_POSITIONS.CORRECTS,
  );

  const officialFamilies = [...support.entries()]
    .filter(([, details]) => details.official)
    .map(([family]) => family);
  const highQualityFamilies = [...support.entries()]
    .filter(
      ([, details]) =>
        QUALITY_RANK[details.quality] >=
        QUALITY_RANK[EVIDENCE_QUALITIES.HIGH],
    )
    .map(([family]) => family);
  const independentHighQualityFamilies = highQualityFamilies.filter(
    (family) => !officialFamilies.includes(family),
  );
  const opposingFamilies = [...disputes.keys()].filter(
    (family) => !support.has(family),
  );

  let label;
  if (
    options.corrected === true ||
    correctionFamilies.size > 0
  ) {
    label = RELIABILITY_LABELS.CORRECTED;
  } else if (opposingFamilies.length > 0) {
    label = RELIABILITY_LABELS.DISPUTED;
  } else if (
    officialFamilies.length > 0 &&
    independentHighQualityFamilies.length > 0
  ) {
    label = RELIABILITY_LABELS.CONFIRMED;
  } else if (officialFamilies.length > 0) {
    label = RELIABILITY_LABELS.OFFICIAL_CLAIM;
  } else if (highQualityFamilies.length >= 2) {
    label = RELIABILITY_LABELS.CORROBORATED;
  } else if (support.size >= 2) {
    label = RELIABILITY_LABELS.DEVELOPING;
  } else {
    label = RELIABILITY_LABELS.EARLY_REPORT;
  }

  return Object.freeze({
    label,
    supportFamilyCount: support.size,
    supportFamilies: Object.freeze([...support.keys()].sort()),
    officialFamilies: Object.freeze(officialFamilies.sort()),
    highQualityFamilies: Object.freeze(highQualityFamilies.sort()),
    disputeFamilies: Object.freeze([...disputes.keys()].sort()),
    correctionFamilies: Object.freeze(
      [...correctionFamilies.keys()].sort(),
    ),
  });
}
