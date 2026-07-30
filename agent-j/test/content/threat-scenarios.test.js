import assert from "node:assert/strict";
import test from "node:test";

import { THREAT_SCENARIOS } from "../../src/content/threat-scenarios.js";

const VARIANT_FIELDS = [
  "classification",
  "capability",
  "attack",
  "defense",
  "weakness",
  "casualty",
  "containment",
];

const SENTENCE_FIELDS = [
  "capability",
  "attack",
  "defense",
  "weakness",
  "casualty",
  "containment",
];

const TIER_SURVIVAL_LIMITS = Object.freeze([
  Object.freeze({ min: 85, max: 100 }),
  Object.freeze({ min: 70, max: 95 }),
  Object.freeze({ min: 45, max: 85 }),
  Object.freeze({ min: 20, max: 70 }),
  Object.freeze({ min: 5, max: 45 }),
  Object.freeze({ min: 1, max: 25 }),
]);

const PREMISE_PATTERNS = new Map([
  [
    "threat-t0-hold-music-hostage",
    /\b(?:hold|queue|call|caller|extension|representative|department)\b/i,
  ],
  [
    "threat-t0-vending-machine-negotiator",
    /\b(?:snack|vending|chips?|candy|quarters?|machine|spiral)\b/i,
  ],
  [
    "threat-t1-folding-chair-apprentice",
    /\b(?:chairs?|hinge|folding|seating|assembly|diagram|manufacturer|hex key)\b/i,
  ],
  [
    "threat-t1-bluetooth-blockade",
    /\b(?:speaker|bluetooth|battery|playlist|volume|bass|paired|unpair)\b/i,
  ],
  [
    "threat-t2-embarrassment-reactor",
    /\b(?:embarrass(?:ment|ed)?|shame|awkward|cringe|witness)\b/i,
  ],
  [
    "threat-t2-counterfeit-badge-marshal",
    /\b(?:badges?|clearance|lanyard|authority|citations?|jurisdiction|credentials?)\b/i,
  ],
  [
    "threat-t3-vape-biome",
    /\b(?:vape|cloud|coil|flavor(?:ed)?|aerosol|cartridge|fog|air)\b/i,
  ],
  [
    "threat-t3-furniture-poltergeist",
    /\b(?:furniture|couch|recliner|ottoman|tables?|upholstery|decor(?:ating)?|floor plan|lamp)\b/i,
  ],
  [
    "threat-t4-accountability-storm",
    /\b(?:accountability|responsibility|blame|consequences?|apology|storm|weather)\b/i,
  ],
  [
    "threat-t4-paperwork-collapse",
    /\b(?:paperwork|forms?|stamps?|filing|clipboard|signatures?|records?|applications?|bureaucratic|retention)\b/i,
  ],
  [
    "threat-t5-notification-singularity",
    /\b(?:notifications?|pings?|unread|group[- ]chat|read[- ]receipts?|mark all as read|mute|phones?|devices?)\b/i,
  ],
  [
    "threat-t5-complaint-continuum",
    /\b(?:complaints?|refunds?|managers?|service|tickets?|receipts?|return policy)\b/i,
  ],
]);

function flattenScenarios() {
  return THREAT_SCENARIOS.flatMap((group) => group.scenarios);
}

function scenarioById(id) {
  const scenario = flattenScenarios().find((candidate) => candidate.id === id);
  assert.ok(scenario, `missing scenario ${id}`);
  return scenario;
}

function normalize(text) {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function assertDeeplyFrozen(value, path = "THREAT_SCENARIOS") {
  assert.equal(Object.isFrozen(value), true, `${path} must be frozen`);
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertDeeplyFrozen(item, `${path}[${index}]`),
    );
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      if (item && typeof item === "object") {
        assertDeeplyFrozen(item, `${path}.${key}`);
      }
    }
  }
}

test("threat scenarios provide six ordered tiers with stable unique IDs", () => {
  assert.equal(THREAT_SCENARIOS.length, 6);
  assert.deepEqual(
    THREAT_SCENARIOS.map((group) => group.tier),
    [0, 1, 2, 3, 4, 5],
  );

  const scenarios = flattenScenarios();
  assert.ok(scenarios.length >= 12);
  assert.equal(
    new Set(scenarios.map((scenario) => scenario.id)).size,
    scenarios.length,
  );

  for (const group of THREAT_SCENARIOS) {
    assert.ok(group.scenarios.length >= 2, `tier ${group.tier}`);
    for (const scenario of group.scenarios) {
      assert.equal(scenario.tier, group.tier);
      assert.match(scenario.id, new RegExp(`^threat-t${group.tier}-[a-z0-9-]+$`));
    }
  }
});

test("the complete scenario graph is deeply frozen", () => {
  assertDeeplyFrozen(THREAT_SCENARIOS);
});

test("every scenario has a premise, intros, complete field coverage, and tier-safe survival odds", () => {
  for (const scenario of flattenScenarios()) {
    assert.match(scenario.premise, /^[A-Z].*[.!?]$/);
    assert.ok(scenario.intros.length >= 2, `${scenario.id}:intros`);
    for (const intro of scenario.intros) {
      assert.match(intro, /^I\b/, `${scenario.id}:intro must use Agent J voice`);
      assert.match(intro, /^[A-Z].*[.!?]$/, `${scenario.id}:intro`);
    }

    for (const field of VARIANT_FIELDS) {
      assert.ok(Array.isArray(scenario[field]), `${scenario.id}:${field}`);
      assert.ok(scenario[field].length >= 3, `${scenario.id}:${field}`);
      for (const variant of scenario[field]) {
        assert.equal(variant.trim(), variant, `${scenario.id}:${field}`);
        assert.ok(variant.length >= 12, `${scenario.id}:${field}`);
      }
    }

    for (const classification of scenario.classification) {
      assert.match(classification, /^[A-Z0-9]/, `${scenario.id}:classification`);
      assert.doesNotMatch(classification, /[.!?]$/, `${scenario.id}:classification`);
    }
    for (const field of SENTENCE_FIELDS) {
      for (const sentence of scenario[field]) {
        assert.match(sentence, /^[A-Z0-9].*[.!?]$/, `${scenario.id}:${field}`);
      }
    }

    const limits = TIER_SURVIVAL_LIMITS[scenario.tier];
    assert.ok(Number.isInteger(scenario.survivalRange.min), scenario.id);
    assert.ok(Number.isInteger(scenario.survivalRange.max), scenario.id);
    assert.ok(scenario.survivalRange.min >= limits.min, scenario.id);
    assert.ok(scenario.survivalRange.max <= limits.max, scenario.id);
    assert.ok(
      scenario.survivalRange.min <= scenario.survivalRange.max,
      scenario.id,
    );
  }
});

test("survival odds decline as threat tiers escalate", () => {
  const tierAverages = THREAT_SCENARIOS.map((group) => {
    const midpoints = group.scenarios.map(
      ({ survivalRange }) => (survivalRange.min + survivalRange.max) / 2,
    );
    return midpoints.reduce((sum, value) => sum + value, 0) / midpoints.length;
  });

  for (let tier = 1; tier < tierAverages.length; tier += 1) {
    assert.ok(
      tierAverages[tier] < tierAverages[tier - 1],
      `tier ${tier} must be less survivable than tier ${tier - 1}`,
    );
  }
});

test("release copy preserves the curated editorial beats", () => {
  const vending = scenarioById("threat-t0-vending-machine-negotiator");
  assert.match(vending.intros.join(" "), /\bno quarters\b/i);
  assert.doesNotMatch(vending.intros.join(" "), /\bexact change\b/i);
  assert.match(
    vending.attack.join(" "),
    /I paid for that.+shoulder-checking the vending machine/i,
  );

  const chair = scenarioById("threat-t1-folding-chair-apprentice");
  assert.match(chair.defense.join(" "), /incoming weapon.+traps/i);
  assert.match(chair.weakness.join(" "), /jammed hinge/i);

  const audio = scenarioById("threat-t1-bluetooth-blockade");
  assert.match(audio.capability.join(" "), /above a responsible level/i);
  assert.match(audio.containment.join(" "), /Accounting's lunch playlist/i);
  assert.match(audio.containment.join(" "), /dead outlet and no charger/i);

  const badge = scenarioById("threat-t2-counterfeit-badge-marshal");
  assert.match(badge.capability.join(" "), /verifies the badge/i);
  assert.match(badge.capability.join(" "), /regional sales conference/i);
  assert.match(badge.capability.join(" "), /credential remains unexamined/i);

  const vape = scenarioById("threat-t3-vape-biome");
  assert.ok(vape.classification.includes("Burnt-Coil Aerosol Warlord"));
  assert.match(vape.attack.join(" "), /lungs.+artificial melon/i);
  assert.match(vape.defense.join(" "), /spits it back sharpened/i);

  const furniture = scenarioById("threat-t3-furniture-poltergeist");
  assert.match(furniture.attack.join(" "), /end tables.+pin the target/i);
  assert.match(furniture.containment.join(" "), /unfurnished room/i);

  const accountability = scenarioById("threat-t4-accountability-storm");
  assert.match(
    accountability.intros.join(" "),
    /victim complex.+lightning storm/i,
  );
  assert.match(
    accountability.attack.join(" "),
    /fist-sized hail.+blaming the nearest witness/i,
  );

  const paperwork = scenarioById("threat-t4-paperwork-collapse");
  assert.match(paperwork.attack.join(" "), /through the desk.+impact crater/i);
  assert.match(
    paperwork.containment.join(" "),
    /source form.+shred every duplicate/i,
  );

  const notifications = scenarioById(
    "threat-t5-notification-singularity",
  );
  assert.match(notifications.intros.join(" "), /satellite out of orbit/i);
  assert.match(notifications.defense.join(" "), /read receipts/i);
  assert.match(notifications.weakness.join(" "), /kill switch/i);
  assert.match(
    [...notifications.weakness, ...notifications.containment].join(" "),
    /global MARK ALL AS READ/i,
  );

  const complaint = scenarioById("threat-t5-complaint-continuum");
  assert.match(
    complaint.weakness.join(" "),
    /full refund from an empowered manager/i,
  );
  assert.match(
    complaint.containment.join(" "),
    /empowered manager.+full reimbursement/i,
  );
});

test("content has no normalized exact duplicates or mojibake", () => {
  const seen = new Map();
  const mojibake = /(?:\uFFFD|â€|â€”|â€“|â€™|Ã.|Â.)/u;

  for (const scenario of flattenScenarios()) {
    const strings = [
      ["premise", scenario.premise],
      ...scenario.intros.map((value) => ["intro", value]),
      ...VARIANT_FIELDS.flatMap((field) =>
        scenario[field].map((value) => [field, value]),
      ),
    ];

    for (const [field, value] of strings) {
      assert.doesNotMatch(value, mojibake, `${scenario.id}:${field}`);
      const normalized = normalize(value);
      assert.ok(normalized.length > 0, `${scenario.id}:${field}`);
      assert.equal(
        seen.has(normalized),
        false,
        `${scenario.id}:${field} duplicates ${seen.get(normalized)}`,
      );
      seen.set(normalized, `${scenario.id}:${field}`);
    }
  }
});

test("every variant reinforces its scenario's single causal premise", () => {
  for (const scenario of flattenScenarios()) {
    const pattern = PREMISE_PATTERNS.get(scenario.id);
    assert.ok(pattern, `missing premise contract for ${scenario.id}`);
    assert.match(scenario.premise, pattern, `${scenario.id}:premise`);

    const variants = [
      ...scenario.intros,
      ...VARIANT_FIELDS.flatMap((field) => scenario[field]),
    ];
    for (const variant of variants) {
      assert.match(variant, pattern, `${scenario.id}: ${variant}`);
    }
  }
});
