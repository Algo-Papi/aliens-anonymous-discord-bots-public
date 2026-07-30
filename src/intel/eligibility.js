export const SIGNIFICANCE_LEVELS = Object.freeze({
  ROUTINE: "routine",
  NOTABLE: "notable",
  MAJOR: "major",
  CRITICAL: "critical",
});

export const ELIGIBILITY_REASONS = Object.freeze({
  DIRECT_US_IMPACT: "direct-us-impact",
  CONSEQUENTIAL_US_GOVERNMENT_ACTION:
    "consequential-us-government-action",
  MAJOR_GLOBAL_SHOCK: "major-global-shock",
  EXCEPTIONAL_SPACE_UAP: "exceptional-space-uap",
});

export const ROUTINE_EXCLUSIONS = Object.freeze({
  COMMENTARY: "commentary",
  INCREMENTAL_BATTLEFIELD_UPDATE: "incremental-battlefield-update",
  ORDINARY_CRIME: "ordinary-crime",
  ROUTINE_FOREIGN_POLITICS: "routine-foreign-politics",
  ROUTINE_US_POLITICS: "routine-us-politics",
  ROUTINE_WEATHER: "routine-weather",
});

const SIGNIFICANCE_RANK = Object.freeze({
  [SIGNIFICANCE_LEVELS.ROUTINE]: 0,
  [SIGNIFICANCE_LEVELS.NOTABLE]: 1,
  [SIGNIFICANCE_LEVELS.MAJOR]: 2,
  [SIGNIFICANCE_LEVELS.CRITICAL]: 3,
});

const REASON_RULES = Object.freeze([
  Object.freeze({
    field: "directUsImpact",
    reason: ELIGIBILITY_REASONS.DIRECT_US_IMPACT,
    minimum: SIGNIFICANCE_LEVELS.NOTABLE,
  }),
  Object.freeze({
    field: "consequentialUsGovernmentAction",
    reason:
      ELIGIBILITY_REASONS.CONSEQUENTIAL_US_GOVERNMENT_ACTION,
    minimum: SIGNIFICANCE_LEVELS.MAJOR,
  }),
  Object.freeze({
    field: "majorGlobalShock",
    reason: ELIGIBILITY_REASONS.MAJOR_GLOBAL_SHOCK,
    minimum: SIGNIFICANCE_LEVELS.MAJOR,
  }),
  Object.freeze({
    field: "exceptionalSpaceUap",
    reason: ELIGIBILITY_REASONS.EXCEPTIONAL_SPACE_UAP,
    minimum: SIGNIFICANCE_LEVELS.MAJOR,
  }),
]);

function normalizeSignificance(value) {
  return Object.hasOwn(SIGNIFICANCE_RANK, value)
    ? value
    : SIGNIFICANCE_LEVELS.ROUTINE;
}

function meetsMinimum(actual, minimum) {
  return SIGNIFICANCE_RANK[actual] >= SIGNIFICANCE_RANK[minimum];
}

/**
 * Evaluates explicit editorial classifications; it intentionally does not infer
 * importance from headline text. This keeps every publish decision auditable.
 */
export function evaluateEligibility(story = {}) {
  const scope = story.scope ?? {};
  const significance = normalizeSignificance(story.significance);
  const exclusions = [
    ...new Set(
      Array.isArray(story.exclusions)
        ? story.exclusions.filter(Boolean).map(String)
        : [],
    ),
  ].sort();

  const consideredReasons = REASON_RULES.filter(
    ({ field }) => scope[field] === true,
  ).map(({ reason }) => reason);
  const qualifyingReasons = REASON_RULES.filter(
    ({ field, minimum }) =>
      scope[field] === true &&
      meetsMinimum(significance, minimum),
  ).map(({ reason }) => reason);

  let code = "eligible";
  if (exclusions.length > 0) {
    code = "routine-or-excluded";
  } else if (consideredReasons.length === 0) {
    code = "outside-us-first-scope";
  } else if (qualifyingReasons.length === 0) {
    code = "below-significance-threshold";
  }

  return Object.freeze({
    eligible: code === "eligible",
    code,
    significance,
    qualifyingReasons: Object.freeze(qualifyingReasons),
    consideredReasons: Object.freeze(consideredReasons),
    exclusions: Object.freeze(exclusions),
  });
}

export function isCriticalSignificance(value) {
  return normalizeSignificance(value) === SIGNIFICANCE_LEVELS.CRITICAL;
}
