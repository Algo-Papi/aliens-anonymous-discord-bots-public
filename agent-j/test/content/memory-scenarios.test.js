import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  MEMORY_DOSSIERS,
  MEMORY_SCENARIOS,
} from "../../src/content/memory-scenarios.js";

const EXPECTED_IDS = [
  "abduction",
  "childhood",
  "missing-weekend",
  "previous-life",
  "experiment",
  "future",
  "funeral",
  "cult",
  "classified-employment",
];

const COLLECTIONS = [
  "periods",
  "locations",
  "reasons",
  "evidenceItems",
  "residualSymptoms",
  "treatments",
];

const EXPECTED_DOSSIER_HASHES = new Map([
  ["abduction-orbital-copay", "b2063fbded7625d2"],
  ["abduction-probe-claim", "19300a1d8ec797e3"],
  ["abduction-examination-scar", "8c4e377f86456143"],
  ["abduction-quarantine", "0f136b499dba35c4"],
  ["childhood-field-trip", "74bdc534792d5549"],
  ["childhood-science-fair", "b88cdfa03e95a6d8"],
  ["childhood-class-pet", "89f462c134690255"],
  ["childhood-imaginary-diplomat", "f277866330d7e05b"],
  ["missing-weekend-sedan-clone", "213fc4c54d1e4c76"],
  ["missing-weekend-orbital-casino", "190a9d8e43db1bc0"],
  ["missing-weekend-karaoke-wedding", "15d9747177471eb7"],
  ["missing-weekend-martian-motel-time-loop", "6118ececeb0ebc10"],
  ["previous-life-asteroid", "c20879ad1700ab05"],
  ["previous-life-criminal-record", "e52795bb1d715ebb"],
  ["previous-life-contraband-vault", "a4127f16ba28effa"],
  ["previous-life-dead-smugglers", "708b3ec26e151a12"],
  ["experiment-placebo", "974bcfccd5a18742"],
  ["experiment-ad-supported-liver", "5217fba554de0f47"],
  ["experiment-apology-trial", "6f03bad996c3dd76"],
  ["experiment-vending-machine-muscles", "c6eb058bd1358034"],
  ["future-autopsy-receipt", "a6664935491ea9f6"],
  ["future-failed-leadership", "bec8d30b62a1abc4"],
  ["future-retirement-warning", "912b838147b4ff09"],
  ["future-evacuating-shadow", "4e7a60abd83fb869"],
  ["funeral-eulogy-interruption", "a5062cf38a47ed72"],
  ["funeral-better-alibi", "20a3a4d1da439eae"],
  ["funeral-cover-identity", "3929b7501be99228"],
  ["funeral-replacement-identity", "61839e1d24765b5f"],
  ["cult-inspection", "74e059313d5885ee"],
  ["cult-buffet-deity", "5b4ec81c828da74f"],
  ["cult-undercover-fax", "877e12ee89cd202e"],
  ["cult-weather-delay", "dc731a19e6ec0620"],
  ["classified-employment-raffle", "d174d2054321cd31"],
  ["classified-employment-ambassador-lunch", "33686c22b6effc42"],
  ["classified-employment-remote-corpses", "a529d560f215ae07"],
  ["classified-employment-cereal-clearance", "20d1dd3c62d14a20"],
]);

const EXPECTED_DOSSIER_IDS = [
  "abduction-orbital-copay",
  "abduction-probe-claim",
  "abduction-examination-scar",
  "abduction-quarantine",
  "childhood-field-trip",
  "childhood-science-fair",
  "childhood-class-pet",
  "childhood-imaginary-diplomat",
  "missing-weekend-sedan-clone",
  "missing-weekend-orbital-casino",
  "missing-weekend-karaoke-wedding",
  "missing-weekend-martian-motel-time-loop",
  "previous-life-asteroid",
  "previous-life-criminal-record",
  "previous-life-contraband-vault",
  "previous-life-dead-smugglers",
  "experiment-placebo",
  "experiment-ad-supported-liver",
  "experiment-apology-trial",
  "experiment-vending-machine-muscles",
  "future-autopsy-receipt",
  "future-failed-leadership",
  "future-retirement-warning",
  "future-evacuating-shadow",
  "funeral-eulogy-interruption",
  "funeral-better-alibi",
  "funeral-cover-identity",
  "funeral-replacement-identity",
  "cult-inspection",
  "cult-buffet-deity",
  "cult-undercover-fax",
  "cult-weather-delay",
  "classified-employment-raffle",
  "classified-employment-ambassador-lunch",
  "classified-employment-remote-corpses",
  "classified-employment-cereal-clearance",
];

function normalize(value) {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim();
}

function assertDeeplyFrozen(value, path = "MEMORY_SCENARIOS") {
  if (!value || typeof value !== "object") {
    return;
  }
  assert.equal(Object.isFrozen(value), true, `${path} must be frozen`);
  for (const [key, child] of Object.entries(value)) {
    assertDeeplyFrozen(child, `${path}.${key}`);
  }
}

test("covers every existing memory family with stable IDs", () => {
  assert.deepEqual(
    MEMORY_SCENARIOS.map((scenario) => scenario.id),
    EXPECTED_IDS,
  );
  assert.equal(new Set(EXPECTED_IDS).size, EXPECTED_IDS.length);
  for (const scenario of MEMORY_SCENARIOS) {
    assert.match(scenario.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.deepEqual(
      Object.keys(scenario),
      ["id", ...COLLECTIONS],
      `${scenario.id} has an unexpected schema`,
    );
  }
});

test("the scenario graph is deeply frozen", () => {
  assertDeeplyFrozen(MEMORY_SCENARIOS);
});

test("exports four stable, deeply frozen dossiers for every family", () => {
  assert.equal(MEMORY_DOSSIERS.length, 36);
  assert.deepEqual(
    MEMORY_DOSSIERS.map((dossier) => dossier.id),
    EXPECTED_DOSSIER_IDS,
  );
  assert.equal(
    new Set(MEMORY_DOSSIERS.map((dossier) => dossier.id)).size,
    MEMORY_DOSSIERS.length,
  );
  assertDeeplyFrozen(MEMORY_DOSSIERS, "MEMORY_DOSSIERS");

  for (const familyId of EXPECTED_IDS) {
    assert.equal(
      MEMORY_DOSSIERS.filter((dossier) => dossier.familyId === familyId)
        .length,
      4,
      `${familyId} must have four dossiers`,
    );
  }

  for (const dossier of MEMORY_DOSSIERS) {
    assert.match(dossier.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(EXPECTED_IDS.includes(dossier.familyId));
    assert.ok(dossier.id.startsWith(`${dossier.familyId}-`));
    assert.deepEqual(Object.keys(dossier), [
      "id",
      "familyId",
      "period",
      "location",
      "reason",
      "evidenceItem",
      "residualSymptom",
      "treatment",
    ]);
    for (const field of [
      "period",
      "location",
      "reason",
      "evidenceItem",
      "residualSymptom",
      "treatment",
    ]) {
      assert.equal(typeof dossier[field], "string");
      assert.ok(dossier[field].length > 0);
    }
  }
});

test("dossiers preserve the premise-locked bank ordering", () => {
  for (const scenario of MEMORY_SCENARIOS) {
    const dossiers = MEMORY_DOSSIERS.filter(
      (dossier) => dossier.familyId === scenario.id,
    );
    for (let index = 0; index < dossiers.length; index += 1) {
      assert.equal(dossiers[index].period, scenario.periods[index]);
      assert.equal(dossiers[index].location, scenario.locations[index]);
      assert.equal(dossiers[index].reason, scenario.reasons[index]);
      assert.equal(dossiers[index].evidenceItem, scenario.evidenceItems[index]);
      assert.equal(
        dossiers[index].residualSymptom,
        scenario.residualSymptoms[index],
      );
      assert.equal(dossiers[index].treatment, scenario.treatments[index]);
    }
  }
});

test("every complete dossier matches its editorially approved golden bundle", () => {
  assert.equal(EXPECTED_DOSSIER_HASHES.size, MEMORY_DOSSIERS.length);
  for (const dossier of MEMORY_DOSSIERS) {
    const serialized = [
      dossier.familyId,
      dossier.period,
      dossier.location,
      dossier.reason,
      dossier.evidenceItem,
      dossier.residualSymptom,
      dossier.treatment,
    ].join("\u001f");
    const hash = createHash("sha256")
      .update(serialized)
      .digest("hex")
      .slice(0, 16);
    assert.equal(
      hash,
      EXPECTED_DOSSIER_HASHES.get(dossier.id),
      `${dossier.id} changed or was rewired without editorial review`,
    );
  }
});

test("the four missing-weekend dossiers stay on distinct premises", () => {
  const copyFor = (id) =>
    Object.values(
      MEMORY_DOSSIERS.find((dossier) => dossier.id === id),
    ).join(" ");

  assert.match(copyFor("missing-weekend-sedan-clone"), /sedan/i);
  assert.match(copyFor("missing-weekend-sedan-clone"), /clone/i);
  assert.match(copyFor("missing-weekend-orbital-casino"), /orbital casino/i);
  assert.match(copyFor("missing-weekend-orbital-casino"), /collateral/i);
  assert.match(copyFor("missing-weekend-karaoke-wedding"), /karaoke/i);
  assert.match(copyFor("missing-weekend-karaoke-wedding"), /wedding|marriage/i);
  assert.match(
    copyFor("missing-weekend-martian-motel-time-loop"),
    /Martian motel/i,
  );
  assert.match(
    copyFor("missing-weekend-martian-motel-time-loop"),
    /before you arrived|time loop/i,
  );
});

test("editorial callbacks remain attached to their intended dossiers", () => {
  const allCopy = MEMORY_DOSSIERS.flatMap((dossier) =>
    Object.values(dossier).filter((value) => typeof value === "string"),
  );
  const has = (expected) => assert.ok(allCopy.includes(expected), expected);

  has("You raise your hand whenever a weather balloon appears overhead.");
  has(
    "the reincarnation office sent your criminal record forward with your soul",
  );
  has(
    "a portrait of your former body making the exact face you make near evidence",
  );
  has(
    "Your prototype muscles engage only when a vending machine refuses your dollar.",
  );
  has(
    "your older self said the mission failed the moment you volunteered to lead it",
  );
  has(
    "a retirement watch engraved DO NOT LET THIS IDIOT TOUCH YESTERDAY",
  );
  has("Your shadow arrives six seconds early and starts evacuating the room.");
  has(
    "Avoid time travel while making plans, giving speeches, or operating heavy machinery.",
  );
  has(
    "Pay the cult's cancellation fee before the inspector closes the prophecy.",
  );

  const funeral = MEMORY_SCENARIOS.find(
    (scenario) => scenario.id === "funeral",
  );
  const casketLegalGags = COLLECTIONS.flatMap(
    (collection) => funeral[collection],
  ).filter(
    (value) =>
      /casket/i.test(value) &&
      /witness protection|restraining order|legal representation/i.test(value),
  );
  assert.equal(casketLegalGags.length, 1);
});

test("every family has enough unique variants in every collection", () => {
  for (const scenario of MEMORY_SCENARIOS) {
    for (const collection of COLLECTIONS) {
      const values = scenario[collection];
      assert.ok(
        values.length >= 3,
        `${scenario.id}.${collection} needs at least three variants`,
      );
      assert.equal(
        new Set(values.map(normalize)).size,
        values.length,
        `${scenario.id}.${collection} contains a normalized duplicate`,
      );
    }
  }
});

test("the full module contains no normalized duplicate copy", () => {
  const occurrences = new Map();
  for (const scenario of MEMORY_SCENARIOS) {
    for (const collection of COLLECTIONS) {
      for (const value of scenario[collection]) {
        const key = normalize(value);
        const paths = occurrences.get(key) ?? [];
        paths.push(`${scenario.id}.${collection}`);
        occurrences.set(key, paths);
      }
    }
  }

  const duplicates = [...occurrences.entries()].filter(
    ([, paths]) => paths.length > 1,
  );
  assert.deepEqual(duplicates, []);
});

test("copy is clean UTF-8 without mojibake or control characters", () => {
  for (const scenario of MEMORY_SCENARIOS) {
    for (const collection of COLLECTIONS) {
      for (const value of scenario[collection]) {
        assert.equal(value, value.trim());
        assert.doesNotMatch(value, /(?:\uFFFD|Ã|Â|â€|ðŸ)/u);
        assert.doesNotMatch(value, /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/u);
      }
    }
  }
});

test("periods and locations are interpolation-safe noun phrases", () => {
  const phrasePrefix =
    /^(?:a|an|the|your|one|two|three|four|five|six|seven|eight|nine|ten|twelve|twenty-four|forty-eight)\b/i;

  for (const scenario of MEMORY_SCENARIOS) {
    for (const period of scenario.periods) {
      assert.match(period, phrasePrefix, `${scenario.id}: invalid period`);
      assert.doesNotMatch(period, /[.!?]$/);
      assert.match(`During ${period}, the subject vanished.`, /^During .+,/);
    }
    for (const location of scenario.locations) {
      assert.match(location, /^(?:a|an|the|your)\b/i);
      assert.doesNotMatch(location, /[.!?]$/);
      assert.match(`at ${location}.`, /^at .+\.$/);
    }
  }
});

test("reasons and evidence obey their sentence-fragment contracts", () => {
  for (const scenario of MEMORY_SCENARIOS) {
    for (const reason of scenario.reasons) {
      assert.match(reason, /^[a-z0-9]/);
      assert.doesNotMatch(reason, /^because\b/i);
      assert.doesNotMatch(reason, /[.!?]$/);
      assert.match(`The Bureau erased it because ${reason}.`, /because .+\.$/);
    }
    for (const evidence of scenario.evidenceItems) {
      assert.match(
        evidence,
        /^(?:a|an|the|your|one|two|three|four)\b/i,
        `${scenario.id}: evidence must be a noun phrase`,
      );
      assert.doesNotMatch(evidence, /[.!?]$/);
      assert.match(`Evidence includes ${evidence}.`, /^Evidence includes .+\.$/);
    }
  }
});

test("residual symptoms and treatments are complete sentences", () => {
  for (const scenario of MEMORY_SCENARIOS) {
    for (const collection of ["residualSymptoms", "treatments"]) {
      for (const sentence of scenario[collection]) {
        assert.match(sentence, /^[A-Z]/);
        assert.match(sentence, /[.!?]$/);
        assert.ok(
          sentence.split(/\s+/).length >= 6,
          `${scenario.id}.${collection} is too fragmentary`,
        );
      }
    }
  }
});
