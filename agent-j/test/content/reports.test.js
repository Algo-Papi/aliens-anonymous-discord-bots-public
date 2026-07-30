import assert from "node:assert/strict";
import test from "node:test";

import {
  ANOMALIES,
  COMBAT_CAPABILITIES,
  CONTAINMENT_PROTOCOLS,
  DEFENSIVE_RESPONSES,
  DISPOSITIONS,
  LIKELY_CASUALTIES,
  MEMORY_CONFIDENCE,
  MEMORY_EVIDENCE,
  MEMORY_FAMILIES,
  MEMORY_LOCATIONS,
  MEMORY_PERIODS,
  MEMORY_REASONS,
  MEMORY_RESIDUALS,
  MEMORY_TREATMENTS,
  OBSERVATION_FAMILIES,
  ORIGINS,
  PRIMARY_ATTACKS,
  SCAN_CONFIDENCE,
  SCAN_THREATS,
  SCAN_WEAKNESSES,
  SENSOR_CONFIDENCE,
  SPECIES,
  THREAT_CLASSIFICATIONS,
  THREAT_WEAKNESSES,
} from "../../src/content/pools.js";
import {
  MEMORY_SOLO_TEMPLATES,
  MEMORY_WITNESS_TEMPLATES,
  ReportGenerator,
  validateReport,
} from "../../src/content/reports.js";
import { SeededRandom } from "../../src/content/random.js";

const ALL_POOLS = [
  SPECIES,
  ORIGINS,
  ANOMALIES,
  SCAN_THREATS,
  SCAN_WEAKNESSES,
  DISPOSITIONS,
  SCAN_CONFIDENCE,
  MEMORY_PERIODS,
  MEMORY_LOCATIONS,
  MEMORY_REASONS,
  MEMORY_EVIDENCE,
  MEMORY_RESIDUALS,
  MEMORY_TREATMENTS,
  MEMORY_CONFIDENCE,
  THREAT_CLASSIFICATIONS,
  COMBAT_CAPABILITIES,
  PRIMARY_ATTACKS,
  DEFENSIVE_RESPONSES,
  THREAT_WEAKNESSES,
  LIKELY_CASUALTIES,
  CONTAINMENT_PROTOCOLS,
  SENSOR_CONFIDENCE,
  ...OBSERVATION_FAMILIES.flatMap((family) => [
    family.reactions,
    family.actions,
    family.outcomes,
  ]),
  ...MEMORY_FAMILIES.flatMap((family) => [
    family.incidents,
    family.escalations,
  ]),
];

test("launch pools meet the planned minimum sizes", () => {
  assert.ok(SPECIES.length >= 40);
  assert.ok(ORIGINS.length >= 30);
  assert.ok(ANOMALIES.length >= 50);
  assert.ok(SCAN_THREATS.length >= 30);
  assert.ok(SCAN_WEAKNESSES.length >= 40);
  assert.ok(DISPOSITIONS.length >= 30);
  assert.ok(SCAN_CONFIDENCE.length >= 15);
  assert.ok(MEMORY_FAMILIES.length >= 8);
  assert.ok(MEMORY_PERIODS.length >= 20);
  assert.ok(MEMORY_LOCATIONS.length >= 30);
  assert.ok(MEMORY_REASONS.length >= 40);
  assert.ok(MEMORY_EVIDENCE.length >= 40);
  assert.ok(MEMORY_RESIDUALS.length >= 50);
  assert.ok(MEMORY_TREATMENTS.length >= 30);
  assert.ok(THREAT_CLASSIFICATIONS.length >= 30);
  assert.ok(COMBAT_CAPABILITIES.length >= 40);
  assert.ok(PRIMARY_ATTACKS.length >= 35);
  assert.ok(DEFENSIVE_RESPONSES.length >= 35);
  assert.ok(THREAT_WEAKNESSES.length >= 40);
  assert.ok(LIKELY_CASUALTIES.length >= 30);
  assert.ok(CONTAINMENT_PROTOCOLS.length >= 30);
});

test("every report word-bank component includes the new contextual expansion", () => {
  const expectedSizes = new Map([
    [SPECIES, 45],
    [ORIGINS, 35],
    [ANOMALIES, 55],
    [SCAN_THREATS, 35],
    [SCAN_WEAKNESSES, 45],
    [DISPOSITIONS, 35],
    [SCAN_CONFIDENCE, 20],
    [MEMORY_PERIODS, 25],
    [MEMORY_LOCATIONS, 35],
    [MEMORY_REASONS, 45],
    [MEMORY_EVIDENCE, 45],
    [MEMORY_RESIDUALS, 55],
    [MEMORY_TREATMENTS, 35],
    [MEMORY_CONFIDENCE, 20],
    [THREAT_CLASSIFICATIONS, 60],
    [COMBAT_CAPABILITIES, 72],
    [PRIMARY_ATTACKS, 66],
    [DEFENSIVE_RESPONSES, 66],
    [THREAT_WEAKNESSES, 72],
    [LIKELY_CASUALTIES, 60],
    [CONTAINMENT_PROTOCOLS, 60],
    [SENSOR_CONFIDENCE, 20],
  ]);
  for (const [pool, size] of expectedSizes) {
    assert.equal(pool.length, size);
  }
  for (const family of OBSERVATION_FAMILIES) {
    assert.equal(family.reactions.length, 13, `${family.id}:reactions`);
    assert.equal(family.actions.length, 13, `${family.id}:actions`);
    assert.equal(family.outcomes.length, 13, `${family.id}:outcomes`);
  }
  for (const family of MEMORY_FAMILIES) {
    assert.equal(family.incidents.length, 12, `${family.id}:incidents`);
    assert.equal(family.escalations.length, 10, `${family.id}:escalations`);
  }
});

test("memory witness narration has varied member and fallback structures", () => {
  assert.equal(MEMORY_WITNESS_TEMPLATES.length, 8);
  assert.equal(MEMORY_SOLO_TEMPLATES.length, 8);
  for (const templates of [
    MEMORY_WITNESS_TEMPLATES,
    MEMORY_SOLO_TEMPLATES,
  ]) {
    assert.equal(
      new Set(
        templates.map((template) =>
          template.render("<@100000000000000002>"),
        ),
      ).size,
      8,
    );
  }
});

test("every content item has a globally unique stable ID", () => {
  const ids = ALL_POOLS.flatMap((pool) => pool.map((entry) => entry.id));
  assert.equal(new Set(ids).size, ids.length);
  for (const pool of ALL_POOLS) {
    for (const entry of pool) {
      assert.match(entry.id, /^[a-z0-9-]+$/);
      assert.ok(entry.text.length > 0);
      assert.equal(Object.isFrozen(entry), true);
    }
  }
});

test("10,000 seeded outputs per report type remain structurally valid", () => {
  const generator = new ReportGenerator({
    random: new SeededRandom(0x4a4a),
  });
  for (let index = 0; index < 10_000; index += 1) {
    const scan = generator.generateScan({
      targetMention: "<@100000000000000001>",
      witnessText: "<@100000000000000002>",
    });
    const memory = generator.generateMemory({
      targetMention: "<@100000000000000001>",
      witnessText: "<@100000000000000002>",
    });
    const threat = generator.generateThreat({
      targetMention: "<@100000000000000001>",
    });

    assert.deepEqual(validateReport(scan), []);
    assert.deepEqual(validateReport(memory), []);
    assert.deepEqual(validateReport(threat), []);
    assert.ok(scan.length <= 1_800);
    assert.ok(memory.length <= 1_800);
    assert.ok(threat.length <= 1_500);
    assert.deepEqual(scan.allowedMentions, { parse: [], users: [] });
    assert.deepEqual(memory.allowedMentions, {
      parse: [],
      users: [],
    });
    assert.deepEqual(threat.allowedMentions, {
      parse: [],
      users: [],
    });
  }
});
