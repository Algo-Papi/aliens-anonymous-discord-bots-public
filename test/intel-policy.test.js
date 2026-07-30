import assert from "node:assert/strict";
import test from "node:test";

import {
  ROUTINE_EXCLUSIONS,
  SIGNIFICANCE_LEVELS,
  applySoftDailyCap,
  evaluateEligibility,
  evaluatePublication,
} from "../src/intel/index.js";

test("admits each US-first editorial route at its threshold", () => {
  const routes = [
    ["directUsImpact", SIGNIFICANCE_LEVELS.NOTABLE],
    ["consequentialUsGovernmentAction", SIGNIFICANCE_LEVELS.MAJOR],
    ["majorGlobalShock", SIGNIFICANCE_LEVELS.MAJOR],
    ["exceptionalSpaceUap", SIGNIFICANCE_LEVELS.MAJOR],
  ];

  for (const [field, significance] of routes) {
    const result = evaluateEligibility({
      scope: { [field]: true },
      significance,
    });
    assert.equal(result.eligible, true, field);
    assert.equal(result.qualifyingReasons.length, 1);
  }
});

test("rejects foreign stories without a US or global exception", () => {
  const result = evaluateEligibility({
    scope: {},
    significance: SIGNIFICANCE_LEVELS.MAJOR,
  });
  assert.equal(result.eligible, false);
  assert.equal(result.code, "outside-us-first-scope");
});

test("rejects consequential routes below their significance floor", () => {
  const result = evaluateEligibility({
    scope: { majorGlobalShock: true },
    significance: SIGNIFICANCE_LEVELS.NOTABLE,
  });
  assert.equal(result.eligible, false);
  assert.equal(result.code, "below-significance-threshold");
});

test("routine exclusions suppress an otherwise qualifying story", () => {
  const result = evaluateEligibility({
    scope: { directUsImpact: true },
    significance: SIGNIFICANCE_LEVELS.MAJOR,
    exclusions: [ROUTINE_EXCLUSIONS.ROUTINE_US_POLITICS],
  });
  assert.equal(result.eligible, false);
  assert.equal(result.code, "routine-or-excluded");
});

test("soft cap allows ordinary cards below six and holds them after six", () => {
  assert.equal(
    applySoftDailyCap({
      publishedToday: 5,
      significance: SIGNIFICANCE_LEVELS.MAJOR,
      reliabilityLabel: "developing",
    }).allowed,
    true,
  );
  const held = applySoftDailyCap({
    publishedToday: 6,
    significance: SIGNIFICANCE_LEVELS.MAJOR,
    reliabilityLabel: "developing",
  });
  assert.equal(held.allowed, false);
  assert.equal(held.code, "soft-cap-held");
});

test("critical, confirmed, and existing-story updates bypass the soft cap", () => {
  assert.equal(
    applySoftDailyCap({
      publishedToday: 99,
      significance: SIGNIFICANCE_LEVELS.CRITICAL,
      reliabilityLabel: "early-report",
    }).allowed,
    true,
  );
  assert.equal(
    applySoftDailyCap({
      publishedToday: 99,
      significance: SIGNIFICANCE_LEVELS.MAJOR,
      reliabilityLabel: "confirmed",
    }).allowed,
    true,
  );
  assert.equal(
    applySoftDailyCap({
      publishedToday: 99,
      significance: SIGNIFICANCE_LEVELS.ROUTINE,
      reliabilityLabel: "corrected",
      isExistingStoryUpdate: true,
    }).allowed,
    true,
  );
});

test("publication combines eligibility, evidence, and cap decisions", () => {
  const decision = evaluatePublication({
    story: {
      scope: { directUsImpact: true },
      significance: SIGNIFICANCE_LEVELS.MAJOR,
    },
    evidence: [
      { sourceKey: "cisa" },
      { sourceKey: "reuters" },
    ],
    publishedToday: 8,
  });
  assert.equal(decision.reliability.label, "confirmed");
  assert.equal(decision.allowed, true);
  assert.equal(decision.code, "soft-cap-exception");
});
