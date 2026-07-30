import assert from "node:assert/strict";
import test from "node:test";

import { FALLBACK_WITNESSES } from "../../src/activity/recent-activity.js";
import {
  MEMORY_DOSSIERS,
  MEMORY_SCENARIOS,
} from "../../src/content/memory-scenarios.js";
import { ContentHistory } from "../../src/content/history.js";
import {
  MEMORY_WITNESS_TEMPLATES,
  ReportGenerator,
  reportLength,
  validateReport,
} from "../../src/content/reports.js";
import { SeededRandom } from "../../src/content/random.js";
import { SCAN_SCENARIOS } from "../../src/content/scan-scenarios.js";
import { THREAT_SCENARIOS } from "../../src/content/threat-scenarios.js";

const TARGET = "<@100000000000000001>";
const WITNESS = "<@100000000000000002>";

const SCAN_BY_ID = new Map(
  SCAN_SCENARIOS.map((scenario) => [scenario.id, scenario]),
);
const MEMORY_BY_ID = new Map(
  MEMORY_SCENARIOS.map((scenario) => [scenario.id, scenario]),
);
const MEMORY_DOSSIER_BY_ID = new Map(
  MEMORY_DOSSIERS.map((dossier) => [dossier.id, dossier]),
);
const THREAT_BY_ID = new Map(
  THREAT_SCENARIOS.flatMap((group) =>
    group.scenarios.map((scenario) => [scenario.id, scenario]),
  ),
);

const EDITORIAL_LIMITS = Object.freeze({
  scan: 1_250,
  memory: 1_400,
  threat: 1_000,
});

function field(report, name) {
  const result = report.fields.find((item) => item.name === name);
  assert.ok(result, `missing field: ${name}`);
  return result.value;
}

function renderedText(report) {
  return [
    report.title,
    report.description,
    ...report.fields.flatMap(({ name, value }) => [name, value]),
    report.footer,
  ].join("\n");
}

function count(text, needle) {
  return text.split(needle).length - 1;
}

function assertEntry(pool, value, label) {
  assert.ok(
    pool.some((entry) => (entry.text ?? entry) === value),
    `${label}: ${JSON.stringify(value)}`,
  );
}

function repeatedShingles(report, size = 5) {
  const segments = [
    report.description,
    ...report.fields.map(({ value }) => value),
    report.footer ?? "",
  ];
  const owners = new Map();

  segments.forEach((segment, segmentIndex) => {
    const words = segment
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    const local = new Set();
    for (let index = 0; index <= words.length - size; index += 1) {
      local.add(words.slice(index, index + size).join(" "));
    }
    for (const phrase of local) {
      const usedBy = owners.get(phrase) ?? new Set();
      usedBy.add(segmentIndex);
      owners.set(phrase, usedBy);
    }
  });

  return [...owners]
    .filter(([, segmentIds]) => segmentIds.size > 1)
    .map(([phrase]) => phrase);
}

function assertHygiene(report) {
  const rendered = renderedText(report);
  const badPatterns = [
    ["missing value", /\b(?:undefined|null|NaN)\b|\[object Object\]/i],
    ["template token", /\$\{[^}]+\}|\{[a-z][^}]*\}/i],
    ["mojibake", /\uFFFD|Ãƒ|Ã‚|Ã¢â‚¬|Ã°Å¸/u],
    ["space before punctuation", /[ \t]+[,.!?;:]/],
    ["horizontal whitespace", /[ \t]{2,}/],
    ["mass mention", /@everyone|@here/i],
  ];
  for (const [label, pattern] of badPatterns) {
    assert.doesNotMatch(rendered, pattern, label);
  }

  assert.deepEqual(repeatedShingles(report), []);
  assert.equal(
    new Set(report.fields.map(({ value }) => value.normalize("NFKC"))).size,
    report.fields.length,
  );
  assert.equal(report.length, reportLength(report));
  assert.ok(report.length <= EDITORIAL_LIMITS[report.command]);
  assert.ok(report.title.length <= 256);
  assert.ok(report.description.length <= 4_096);
  assert.ok(report.fields.length <= 25);
  assert.ok(report.footer.length <= 2_048);
  for (const item of report.fields) {
    assert.ok(item.name.length <= 256);
    assert.ok(item.value.length <= 1_024);
  }
}

function assertScanComposition(report) {
  const scenario = SCAN_BY_ID.get(report.composition.scenarioId);
  assert.ok(scenario, report.composition.scenarioId);
  assert.ok(report.description.includes(scenario.premise));
  assertEntry(scenario.species, field(report, "Species"), "species");
  assertEntry(scenario.origins, field(report, "Origin"), "origin");
  assertEntry(
    scenario.anomalies,
    field(report, "Anatomical anomaly"),
    "anomaly",
  );
  assertEntry(
    scenario.threatLabels,
    field(report, "Threat level"),
    "threat",
  );
  assertEntry(
    scenario.weaknesses,
    field(report, "Known weakness"),
    "weakness",
  );
  assertEntry(
    scenario.dispositions,
    field(report, "Disposition"),
    "disposition",
  );

  const observation = field(report, "Bureau observation");
  const allowedObservations = scenario.observations.map(({ template }) =>
    template
      .replace("{target}", TARGET)
      .replace("{witness}", WITNESS),
  );
  assert.ok(allowedObservations.includes(observation));
  assert.equal(count(observation, TARGET), 1);
  assert.equal(count(observation, WITNESS), 1);
}

function assertMemoryComposition(report) {
  const scenario = MEMORY_BY_ID.get(report.composition.scenarioId);
  const dossier = MEMORY_DOSSIER_BY_ID.get(report.composition.dossierId);
  assert.ok(scenario, report.composition.scenarioId);
  assert.ok(dossier, report.composition.dossierId);
  assert.equal(dossier.familyId, scenario.id);
  assert.equal(count(report.description, TARGET), 1);
  assert.equal(count(report.description, WITNESS), 1);
  assert.match(report.description, /\bDuring .+, Bureau records place you at /);
  assert.doesNotMatch(report.description, new RegExp(`${TARGET}\\s+were\\b`, "i"));
  assert.ok(
    report.description.includes(`During ${dossier.period},`),
  );
  assert.ok(
    report.description.includes(`at ${dossier.location}.`),
  );
  assert.ok(
    report.description.includes(`because ${dossier.reason}.`),
  );
  assert.equal(
    field(report, "Evidence recovered"),
    `${dossier.evidenceItem.charAt(0).toUpperCase()}${dossier.evidenceItem.slice(1)}.`,
  );
  assert.equal(
    field(report, "Residual symptom"),
    dossier.residualSymptom,
  );
  assert.equal(
    field(report, "Recommended treatment"),
    dossier.treatment,
  );
}

function assertThreatComposition(report) {
  const scenario = THREAT_BY_ID.get(report.composition.scenarioId);
  assert.ok(scenario, report.composition.scenarioId);
  assert.equal(report.composition.tier, scenario.tier);
  assert.match(
    report.description,
    new RegExp(`\\*\\*Threat tier:\\*\\* ${scenario.tier}`),
  );
  assert.doesNotMatch(report.description, /Tactical premise:/);
  assert.ok(
    scenario.intros.some((intro) => report.description.includes(intro)),
  );

  for (const [label, key] of [
    ["Threat classification", "classification"],
    ["Combat capability", "capability"],
    ["Primary attack", "attack"],
    ["Defensive response", "defense"],
    ["Known weakness", "weakness"],
    ["Likely casualty", "casualty"],
    ["Containment protocol", "containment"],
  ]) {
    assertEntry(scenario[key], field(report, label), `${scenario.id}:${key}`);
  }

  const probability = Number.parseInt(
    field(report, "Mission success probability"),
    10,
  );
  assert.ok(probability >= scenario.survivalRange.min);
  assert.ok(probability <= scenario.survivalRange.max);
}

test("memory witness narration has varied structures", () => {
  assert.equal(MEMORY_WITNESS_TEMPLATES.length, 8);
  assert.equal(
    new Set(
      MEMORY_WITNESS_TEMPLATES.map((template) =>
        template.render(WITNESS),
      ),
    ).size,
    8,
  );
});

test("every fictional fallback witness renders with sound grammar", () => {
  const generator = new ReportGenerator({
    random: new SeededRandom(0xfa11ba),
  });
  let sawScanSentenceSubject = false;

  for (const witnessText of FALLBACK_WITNESSES) {
    const sentenceSubject =
      `${witnessText.charAt(0).toUpperCase()}${witnessText.slice(1)}`;
    for (let index = 0; index < 40; index += 1) {
      const scan = generator.generateScan({
        targetMention: TARGET,
        witnessText,
      });
      const observation = field(scan, "Bureau observation");
      assert.notEqual(
        observation.includes(`${witnessText}'s`),
        true,
        `${witnessText}: whole fallback phrase used as a possessive`,
      );
      if (
        witnessText === "an unpaid Bureau intern" &&
        observation.startsWith("An unpaid Bureau intern")
      ) {
        sawScanSentenceSubject = true;
      }

      const memory = generator.generateMemory({
        targetMention: TARGET,
        witnessText,
      });
      assert.ok(
        memory.description.includes(`. ${sentenceSubject} `),
        `${witnessText}: memory witness is not a sentence subject`,
      );
      assert.doesNotMatch(memory.description, /\bthemself\b/i);
    }
  }

  assert.equal(sawScanSentenceSubject, true);
});

test("small history pools never repeat the immediately previous entry", () => {
  const history = new ContentHistory();
  const random = new SeededRandom(0x515151);
  const pool = [
    { id: "alpha", text: "Alpha" },
    { id: "beta", text: "Beta" },
    { id: "gamma", text: "Gamma" },
    { id: "delta", text: "Delta" },
  ];
  let previousId = null;

  for (let index = 0; index < 1_000; index += 1) {
    const selected = history.choose("small-pool", pool, random);
    assert.notEqual(selected.id, previousId);
    previousId = selected.id;
  }
});

test("the intended short first-film quotation remains reachable in live copy", () => {
  const generator = new ReportGenerator({
    random: new SeededRandom(0x4d4942),
  });
  const outputs = [];
  for (let index = 0; index < 64; index += 1) {
    outputs.push(
      renderedText(
        generator.generateScan({
          targetMention: TARGET,
          witnessText: WITNESS,
        }),
      ),
    );
  }
  assert.ok(outputs.some((output) => output.includes("I make this look good.")));
});

test("10,000 seeded outputs per report type remain coherent and valid", () => {
  const generator = new ReportGenerator({
    random: new SeededRandom(0x4a4a),
  });
  const coverage = {
    scan: new Set(),
    memory: new Set(),
    threat: new Set(),
  };
  const previousScenario = {
    scan: null,
    memory: null,
    threat: null,
  };
  let previousDossier = null;
  const previousConfidence = {
    scan: null,
    memory: null,
  };

  for (let index = 0; index < 10_000; index += 1) {
    const reports = [
      generator.generateScan({
        targetMention: TARGET,
        witnessText: WITNESS,
      }),
      generator.generateMemory({
        targetMention: TARGET,
        witnessText: WITNESS,
      }),
      generator.generateThreat({ targetMention: TARGET }),
    ];

    for (const report of reports) {
      assert.deepEqual(
        validateReport(report),
        [],
        `${report.command} sample ${index}`,
      );
      assert.deepEqual(report.allowedMentions, {
        parse: [],
        users: [],
      });
      assert.notEqual(
        report.composition.scenarioId,
        previousScenario[report.command],
        `${report.command} repeated its premise at sample ${index}`,
      );
      previousScenario[report.command] = report.composition.scenarioId;
      if (report.composition.dossierId) {
        assert.notEqual(
          report.composition.dossierId,
          previousDossier,
          `memory repeated its dossier at sample ${index}`,
        );
        previousDossier = report.composition.dossierId;
      }
      const confidenceName = {
        scan: "Scan confidence",
        memory: "Recovery confidence",
      }[report.command];
      if (confidenceName) {
        const confidence = field(report, confidenceName);
        assert.notEqual(
          confidence,
          previousConfidence[report.command],
          `${report.command} repeated confidence at sample ${index}`,
        );
        previousConfidence[report.command] = confidence;
      }
      coverage[report.command].add(report.composition.scenarioId);
      assertHygiene(report);
    }

    assertScanComposition(reports[0]);
    assertMemoryComposition(reports[1]);
    assertThreatComposition(reports[2]);
  }

  assert.deepEqual(
    coverage.scan,
    new Set(SCAN_SCENARIOS.map(({ id }) => id)),
  );
  assert.deepEqual(
    coverage.memory,
    new Set(MEMORY_SCENARIOS.map(({ id }) => id)),
  );
  assert.deepEqual(coverage.threat, new Set(THREAT_BY_ID.keys()));
});

test("an approved seed preserves Agent J's premise-first voice", () => {
  const scan = new ReportGenerator({
    random: new SeededRandom(0x4a4a),
  }).generateScan({
    targetMention: TARGET,
    witnessText: WITNESS,
  });
  assert.equal(scan.composition.scenarioId, "counterfeit-human");
  assert.equal(field(scan, "Species"), "Discount Human Replica");
  assert.match(
    field(scan, "Bureau observation"),
    /pocket card labeled HOW HANDS WORK/,
  );

  const memory = new ReportGenerator({
    random: new SeededRandom(0x4a4a),
  }).generateMemory({
    targetMention: TARGET,
    witnessText: WITNESS,
  });
  assert.equal(memory.composition.dossierId, "previous-life-asteroid");
  assert.match(memory.description, /asteroid that destroyed employee parking/);
  assert.match(field(memory, "Evidence recovered"), /lunar customs ledger/);

  const threat = new ReportGenerator({
    random: new SeededRandom(0x4a4a),
  }).generateThreat({
    targetMention: TARGET,
  });
  assert.equal(
    threat.composition.scenarioId,
    "threat-t3-vape-biome",
  );
  assert.match(field(threat, "Primary attack"), /vape cloud/);
});
