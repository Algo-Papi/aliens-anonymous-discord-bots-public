import {
  evaluateEligibility,
  isCriticalSignificance,
} from "./eligibility.js";
import {
  RELIABILITY_LABELS,
  assessReliability,
} from "./evidence.js";

export const DEFAULT_DAILY_POLICY = Object.freeze({
  softDailyCap: 6,
});

/**
 * The cap is deliberately soft: existing story updates do not consume it, and
 * critical or confirmed stories can still create a card after it is reached.
 */
export function applySoftDailyCap(
  {
    publishedToday = 0,
    significance,
    reliabilityLabel,
    isExistingStoryUpdate = false,
  } = {},
  policy = DEFAULT_DAILY_POLICY,
) {
  const count = Math.max(0, Number(publishedToday) || 0);
  const cap = Math.max(
    0,
    Number(policy.softDailyCap) ||
      DEFAULT_DAILY_POLICY.softDailyCap,
  );

  if (isExistingStoryUpdate) {
    return Object.freeze({
      allowed: true,
      code: "existing-story-update",
      cap,
      publishedToday: count,
    });
  }
  if (count < cap) {
    return Object.freeze({
      allowed: true,
      code: "below-soft-cap",
      cap,
      publishedToday: count,
    });
  }
  if (
    reliabilityLabel === RELIABILITY_LABELS.CONFIRMED ||
    isCriticalSignificance(significance)
  ) {
    return Object.freeze({
      allowed: true,
      code: "soft-cap-exception",
      cap,
      publishedToday: count,
    });
  }
  return Object.freeze({
    allowed: false,
    code: "soft-cap-held",
    cap,
    publishedToday: count,
  });
}

export function evaluatePublication({
  story = {},
  evidence = [],
  publishedToday = 0,
  isExistingStoryUpdate = false,
  policy = DEFAULT_DAILY_POLICY,
} = {}) {
  const eligibility = evaluateEligibility(story);
  const reliability = assessReliability(evidence, {
    corrected: story.corrected === true,
  });
  const cap = applySoftDailyCap(
    {
      publishedToday,
      significance: eligibility.significance,
      reliabilityLabel: reliability.label,
      isExistingStoryUpdate,
    },
    policy,
  );
  const allowed =
    (eligibility.eligible || isExistingStoryUpdate) && cap.allowed;

  return Object.freeze({
    allowed,
    code: !eligibility.eligible && !isExistingStoryUpdate
      ? eligibility.code
      : cap.code,
    eligibility,
    reliability,
    cap,
  });
}
