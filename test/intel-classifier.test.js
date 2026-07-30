import assert from "node:assert/strict";
import test from "node:test";

import { classifyCandidate } from "../src/intel/classifier.js";
import {
  ROUTINE_EXCLUSIONS,
  SIGNIFICANCE_LEVELS,
  evaluateEligibility,
} from "../src/intel/index.js";

function candidate(title, overrides = {}) {
  return {
    id: "item",
    sourceKey: "bno-news",
    source: { key: "bno-news", label: "BNO News" },
    title,
    summary: title,
    url: "https://example.test/item",
    publishedAt: "2026-07-28T18:00:00.000Z",
    ...overrides,
  };
}

test("classifies a consequential US emergency without trusting BREAKING alone", () => {
  const story = classifyCandidate(
    candidate(
      "BREAKING: Massive explosion closes a major airport in Dallas; federal emergency response underway",
    ),
  );
  assert.equal(story.scope.directUsImpact, true);
  assert.equal(story.significance, SIGNIFICANCE_LEVELS.NOTABLE);
  assert.equal(evaluateEligibility(story).eligible, true);

  const decorationOnly = classifyCandidate(
    candidate("BREAKING: A celebrity shared a new interview"),
  );
  assert.equal(evaluateEligibility(decorationOnly).eligible, false);
});

test("admits only genuinely consequential US government action", () => {
  const consequential = classifyCandidate(
    candidate(
      "U.S. Supreme Court overturns nationwide emergency immigration policy",
      { sourceKey: "reuters", source: { key: "reuters" } },
    ),
  );
  assert.equal(
    consequential.scope.consequentialUsGovernmentAction,
    true,
  );
  assert.equal(consequential.significance, SIGNIFICANCE_LEVELS.MAJOR);

  const poll = classifyCandidate(
    candidate("New U.S. campaign poll changes approval rating by one point"),
  );
  assert.ok(
    poll.exclusions.includes(
      ROUTINE_EXCLUSIONS.ROUTINE_US_POLITICS,
    ),
  );
  assert.equal(evaluateEligibility(poll).eligible, false);
});

test("recognizes critical global shocks without adding regional routine news", () => {
  const nuclear = classifyCandidate(
    candidate(
      "Officials report a nuclear detonation as war expands across borders",
      { sourceKey: "bbc-breaking", source: { key: "bbc-breaking" } },
    ),
  );
  assert.equal(nuclear.scope.majorGlobalShock, true);
  assert.equal(nuclear.significance, SIGNIFICANCE_LEVELS.CRITICAL);
  assert.equal(evaluateEligibility(nuclear).eligible, true);

  const routine = classifyCandidate(
    candidate("Coalition negotiations continue after a regional election"),
  );
  assert.equal(evaluateEligibility(routine).eligible, false);
});

test("requires exceptional language for UAP and space items", () => {
  const confirmed = classifyCandidate(
    candidate(
      "NASA confirms first verified evidence of extraterrestrial life",
      { sourceKey: "nasa", source: { key: "nasa" } },
    ),
  );
  assert.equal(confirmed.scope.exceptionalSpaceUap, true);
  assert.equal(confirmed.significance, SIGNIFICANCE_LEVELS.MAJOR);

  const casual = classifyCandidate(
    candidate("New podcast discusses UFO theories and alien life"),
  );
  assert.equal(casual.scope.exceptionalSpaceUap, false);
  assert.ok(casual.exclusions.includes(ROUTINE_EXCLUSIONS.COMMENTARY));
});

test("uses official severity and geography metadata audibly", () => {
  const story = classifyCandidate(
    candidate("M6.7 earthquake in Southern California", {
      sourceKey: "usgs",
      source: { key: "usgs" },
      eventId: "us7000test",
      eventType: "earthquake",
      geography: { countryCode: "US", areas: ["Southern California"] },
      severity: { rank: 4, label: "Major" },
    }),
  );
  assert.equal(story.scope.directUsImpact, true);
  assert.equal(story.significance, SIGNIFICANCE_LEVELS.MAJOR);
  assert.deepEqual(story.eventKeys, ["usgs:us7000test"]);
});

test("does not mistake the ordinary word us for the U.S.", () => {
  const story = classifyCandidate(
    candidate(
      "Nostalgia for stability gives us a look at one family's life abroad",
      { sourceKey: "reuters", source: { key: "reuters" } },
    ),
  );
  assert.equal(story.scope.directUsImpact, false);
  assert.equal(evaluateEligibility(story).eligible, false);
});

test("suppresses procedural politics, human-interest followups, and incremental strikes", () => {
  const procedural = classifyCandidate(
    candidate(
      "Administration urges Supreme Court to allow mail-in voting order before the midterms",
    ),
  );
  assert.ok(
    procedural.exclusions.includes(
      ROUTINE_EXCLUSIONS.ROUTINE_US_POLITICS,
    ),
  );

  const humanInterest = classifyCandidate(
    candidate(
      "Two Seattle residents opened their home after Sunday's deadly shooting",
    ),
  );
  assert.ok(
    humanInterest.exclusions.includes(ROUTINE_EXCLUSIONS.COMMENTARY),
  );

  const incremental = classifyCandidate(
    candidate(
      "U.S. forces began another night of strikes, the 13th consecutive night",
    ),
  );
  assert.ok(
    incremental.exclusions.includes(
      ROUTINE_EXCLUSIONS.INCREMENTAL_BATTLEFIELD_UPDATE,
    ),
  );
});
