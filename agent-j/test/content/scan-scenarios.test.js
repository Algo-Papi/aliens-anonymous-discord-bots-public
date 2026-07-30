import assert from "node:assert/strict";
import test from "node:test";

import { SCAN_SCENARIOS } from "../../src/content/scan-scenarios.js";

const SLOT_NAMES = Object.freeze([
  "species",
  "origins",
  "anomalies",
  "threatLabels",
  "weaknesses",
  "dispositions",
]);

const EXPECTED_SCENARIO_IDS = Object.freeze([
  "counterfeit-human",
  "recalled-bureau-prototype",
  "botched-abduction-return",
  "attention-seeking-cryptid",
  "timeline-duplicate",
  "diplomatic-pest",
]);

function collectObjects(value, result = []) {
  if (value === null || typeof value !== "object") {
    return result;
  }
  result.push(value);
  for (const nested of Object.values(value)) {
    collectObjects(nested, result);
  }
  return result;
}

function normalize(text) {
  return text
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function occurrences(text, token) {
  return text.split(token).length - 1;
}

test("scan scenario families have stable IDs and complete slot coverage", () => {
  assert.deepEqual(
    SCAN_SCENARIOS.map((scenario) => scenario.id),
    EXPECTED_SCENARIO_IDS,
  );

  for (const scenario of SCAN_SCENARIOS) {
    assert.match(scenario.id, /^[a-z0-9-]+$/);
    assert.ok(scenario.label.length > 0, `${scenario.id}: label`);
    assert.ok(scenario.premise.length > 0, `${scenario.id}: premise`);

    for (const slot of SLOT_NAMES) {
      assert.ok(Array.isArray(scenario[slot]), `${scenario.id}: ${slot}`);
      assert.ok(
        scenario[slot].length >= 3,
        `${scenario.id}: ${slot} needs at least three variants`,
      );
      for (const entry of scenario[slot]) {
        assert.match(entry.id, /^[a-z0-9-]+$/);
        assert.equal(entry.text, entry.text.trim());
        assert.ok(entry.text.length > 0);
        assert.doesNotMatch(entry.text, /[{}]/);
      }
    }

    assert.ok(
      scenario.observations.length >= 3,
      `${scenario.id}: observations need at least three scenarios`,
    );
  }
});

test("the exported scenario graph is deeply frozen", () => {
  for (const value of collectObjects(SCAN_SCENARIOS)) {
    assert.equal(Object.isFrozen(value), true);
  }

  assert.throws(() => {
    SCAN_SCENARIOS.push({});
  }, TypeError);
  assert.throws(() => {
    SCAN_SCENARIOS[0].species[0].text = "mutated";
  }, TypeError);
  assert.throws(() => {
    SCAN_SCENARIOS[0].observations[0].placeholders.push("intruder");
  }, TypeError);
});

test("all content IDs are globally unique and all authored text is distinct", () => {
  const contentIds = [];
  const authoredText = [];

  for (const scenario of SCAN_SCENARIOS) {
    contentIds.push(scenario.id);
    authoredText.push(scenario.label, scenario.premise);
    for (const slot of SLOT_NAMES) {
      for (const entry of scenario[slot]) {
        contentIds.push(entry.id);
        authoredText.push(entry.text);
      }
    }
    for (const observation of scenario.observations) {
      contentIds.push(observation.id);
      authoredText.push(observation.template);
    }
  }

  assert.equal(new Set(contentIds).size, contentIds.length);
  const normalized = authoredText.map(normalize);
  assert.equal(new Set(normalized).size, normalized.length);
});

test("observation templates honor the witness and target contract", () => {
  for (const scenario of SCAN_SCENARIOS) {
    for (const observation of scenario.observations) {
      assert.match(observation.id, /^[a-z0-9-]+$/);
      assert.deepEqual(observation.placeholders, ["witness", "target"]);
      assert.equal(occurrences(observation.template, "{witness}"), 1);
      assert.equal(occurrences(observation.template, "{target}"), 1);
      assert.doesNotMatch(
        observation.template,
        /\{witness\}'s/,
        `${observation.id}: fallback witness phrases cannot be possessive`,
      );

      const unknownPlaceholders = [
        ...observation.template.matchAll(/\{([^}]+)\}/g),
      ]
        .map((match) => match[1])
        .filter((name) => !observation.placeholders.includes(name));
      assert.deepEqual(unknownPlaceholders, []);

      const rendered = observation.template
        .replace("{witness}", "@Witness")
        .replace("{target}", "@Target");
      assert.match(rendered, /@Witness/);
      assert.match(rendered, /@Target/);
      assert.doesNotMatch(rendered, /[{}]/);
      assert.doesNotMatch(rendered, /\s{2,}/);
      assert.match(rendered, /[.!?]$/);
    }
  }
});

test("scenario content contains no common mojibake markers", () => {
  const serialized = JSON.stringify(SCAN_SCENARIOS);
  for (const marker of ["\uFFFD", "Ã", "Â", "â€", "ðŸ", "ï¿½"]) {
    assert.equal(
      serialized.includes(marker),
      false,
      `unexpected mojibake marker: ${marker}`,
    );
  }
});
