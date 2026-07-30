import { ContentHistory, entries } from "./history.js";
import { MEMORY_DOSSIERS } from "./memory-scenarios.js";
import { RandomSource } from "./random.js";
import { SCAN_SCENARIOS } from "./scan-scenarios.js";
import { THREAT_SCENARIOS } from "./threat-scenarios.js";

const REPORT_COLORS = Object.freeze({
  scan: 0x20c997,
  memory: 0x7950f2,
  threat: 0xff6b35,
});

function renderEntries(prefix, renderers) {
  return Object.freeze(
    renderers.map((render, index) =>
      Object.freeze({
        id: `${prefix}-${String(index + 1).padStart(2, "0")}`,
        render,
        weight: 1,
      }),
    ),
  );
}

export const MEMORY_WITNESS_TEMPLATES = renderEntries(
  "memory-witness",
  [
    (witness) =>
      `${witness} confirmed the timeline, then asked Legal to remove their name from every future edition.`,
    (witness) =>
      `${witness} corroborated the account and immediately regretted being the most credible person in the room.`,
    (witness) =>
      `${witness} reviewed the evidence, said “that tracks,” and requested a different planet.`,
    (witness) =>
      `${witness} identified the subject without hesitation; the hesitation started after the details.`,
    (witness) =>
      `${witness} signed the statement after Agent J promised the paperwork would be less traumatic than the memory.`,
    (witness) =>
      `${witness} supplied a matching account and one deeply unhelpful drawing.`,
    (witness) =>
      `${witness} placed the subject at the scene and then moved behind a locked door.`,
    (witness) =>
      `${witness} confirmed the sequence, declined follow-up questions, and blamed the Bureau dental plan.`,
  ],
);

const SCAN_CONFIDENCE = entries("coherent-scan-confidence", [
  "99% — three independent passes returned the same diagnosis.",
  "96% — the scanner, backup scanner, and Agent J all agree.",
  "93% — the only disputed reading came from the subject.",
  "90% — the hardware is stable; the subject remains the variable.",
]);

const MEMORY_CONFIDENCE = entries("coherent-memory-confidence", [
  "98% — the timeline, witness account, and physical evidence agree.",
  "95% — the recovered sequence passed a second neural review.",
  "92% — one damaged frame remains, but the incident is intact.",
  "89% — the memory resisted recovery, not the conclusion.",
]);

const SCAN_FOOTERS = entries("coherent-scan-footer", [
  "Agent J • “I make this look good.” The organism remains under appeal.",
  "M.I.B. Xenobiology • The scanner is fine; the diagnosis is personal.",
  "Agent J • Filed under: somebody else's evolutionary problem.",
  "Bureau field note • Do not feed, flatter, or finance the subject.",
  "M.I.B. Xenobiology • Anatomy verified. Warranty denied.",
  "Agent J • Case closed; the specimen unfortunately remains open.",
  "Bureau scan archive • One premise, several bad decisions.",
  "Agent J • The suit survived contact. Barely.",
]);

const MEMORY_FOOTERS = entries("coherent-memory-footer", [
  "Agent J • I recovered the memory. Therapy remains outside Bureau jurisdiction.",
  "M.I.B. Neural Hygiene • Some thoughts deserve an unmarked grave.",
  "Agent J • I restored the truth and immediately regretted enabling backups.",
  "Memory file sealed • Counseling, litigation, and a less curious species pending.",
  "Bureau notice • Remembering is not the same as receiving clearance.",
  "Agent J • Truth restored. Dignity was never included in the recovery point.",
]);

const THREAT_FOOTERS = entries("coherent-threat-footer", [
  "Agent J • One threat. One plan. No mystery.",
  "M.I.B. Tactical • Ugly scenario. Clean readout.",
  "Agent J • Threat found. Odds set. Suit immaculate.",
  "Bureau • Follow protocol. Stay out of evidence.",
  "Agent J • The math is final. Review your options.",
  "M.I.B. Tactical • Containment beats improvisation.",
]);

const MEMORY_FAMILY_POOLS = Object.freeze(
  [...new Set(MEMORY_DOSSIERS.map(({ familyId }) => familyId))].map(
    (familyId) =>
      Object.freeze({
        id: familyId,
        dossiers: Object.freeze(
          MEMORY_DOSSIERS.filter(
            (dossier) => dossier.familyId === familyId,
          ),
        ),
      }),
  ),
);

const ALL_THREAT_SCENARIOS = Object.freeze(
  THREAT_SCENARIOS.flatMap((group) => group.scenarios),
);

function choose(history, key, pool, random) {
  return history.choose(key, pool, random);
}

function chooseText(history, key, scenarioId, slot, values, random) {
  return choose(
    history,
    key,
    values.map((text, index) => ({
      id: `${scenarioId}-${slot}-${String(index + 1).padStart(2, "0")}`,
      text,
      weight: 1,
    })),
    random,
  );
}

function sentenceCaseSubject(value) {
  if (value.startsWith("<@")) return value;
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function renderObservation(template, { targetMention, witnessText }) {
  const renderedWitness = template.trimStart().startsWith("{witness}")
    ? sentenceCaseSubject(witnessText)
    : witnessText;
  return template
    .replace("{target}", targetMention)
    .replace("{witness}", renderedWitness);
}

function titleCaseId(id) {
  return id
    .split("-")
    .map((part) => `${part[0].toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function caseNumber(prefix, random) {
  const year = new Date().getUTCFullYear();
  return `${prefix}-${year}-${String(random.int(0, 1_000_000)).padStart(6, "0")}`;
}

function reportLength(report) {
  return (
    report.title.length +
    (report.description?.length ?? 0) +
    report.fields.reduce(
      (total, field) => total + field.name.length + field.value.length,
      0,
    ) +
    (report.footer?.length ?? 0)
  );
}

function finalizeReport(command, report, signature, composition) {
  const length = reportLength(report);
  return {
    ...report,
    command,
    signature,
    composition,
    length,
    color: REPORT_COLORS[command],
    allowedMentions: { parse: [], users: [] },
  };
}

export class ReportGenerator {
  constructor({
    random = new RandomSource(),
    history = new ContentHistory(),
  } = {}) {
    this.random = random;
    this.history = history;
    this.lastDeliveredConfidence = new Map();
    this.lastDeliveredScenario = new Map();
  }

  generateScan({ targetMention, witnessText }) {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const scenario = choose(
        this.history,
        "scan:scenario",
        SCAN_SCENARIOS,
        this.random,
      );
      const species = choose(
        this.history,
        `scan:${scenario.id}:species`,
        scenario.species,
        this.random,
      );
      const origin = choose(
        this.history,
        `scan:${scenario.id}:origin`,
        scenario.origins,
        this.random,
      );
      const anomaly = choose(
        this.history,
        `scan:${scenario.id}:anomaly`,
        scenario.anomalies,
        this.random,
      );
      const threat = choose(
        this.history,
        `scan:${scenario.id}:threat`,
        scenario.threatLabels,
        this.random,
      );
      const weakness = choose(
        this.history,
        `scan:${scenario.id}:weakness`,
        scenario.weaknesses,
        this.random,
      );
      const disposition = choose(
        this.history,
        `scan:${scenario.id}:disposition`,
        scenario.dispositions,
        this.random,
      );
      const confidence = choose(
        this.history,
        "scan:confidence",
        SCAN_CONFIDENCE,
        this.random,
      );
      const observationTemplate = choose(
        this.history,
        `scan:${scenario.id}:observation`,
        scenario.observations,
        this.random,
      );
      const observation = renderObservation(observationTemplate.template, {
        targetMention,
        witnessText,
      });
      const signature = [
        scenario.id,
        species.id,
        origin.id,
        anomaly.id,
        threat.id,
        weakness.id,
        disposition.id,
        observationTemplate.id,
      ].join("|");
      const report = finalizeReport(
        "scan",
        {
          title: "M.I.B. XENOBIOLOGICAL SCAN",
          description:
            `**Subject:** ${targetMention}\n` +
            `**Case:** \`${caseNumber("XENO", this.random)}\`\n\n` +
            "Agent J reviewed every pass. Unfortunately, they all confirmed the same embarrassing diagnosis.\n\n" +
            `**Bureau theory:** ${scenario.premise}`,
          fields: [
            { name: "Species", value: species.text, inline: true },
            { name: "Origin", value: origin.text, inline: true },
            {
              name: "Anatomical anomaly",
              value: anomaly.text,
              inline: false,
            },
            { name: "Threat level", value: threat.text, inline: true },
            {
              name: "Known weakness",
              value: weakness.text,
              inline: true,
            },
            {
              name: "Bureau observation",
              value: observation,
              inline: false,
            },
            {
              name: "Disposition",
              value: disposition.text,
              inline: false,
            },
            {
              name: "Scan confidence",
              value: confidence.text,
              inline: false,
            },
          ],
          footer: choose(
            this.history,
            "scan:footer",
            SCAN_FOOTERS,
            this.random,
          ).text,
        },
        signature,
        { scenarioId: scenario.id },
      );
      if (
        report.length <= 1_800 &&
        !this.history.hasRecentSignature("scan", signature) &&
        this.lastDeliveredScenario.get("scan") !== scenario.id &&
        this.lastDeliveredConfidence.get("scan") !== confidence.id
      ) {
        this.history.recordSignature("scan", signature);
        this.lastDeliveredScenario.set("scan", scenario.id);
        this.lastDeliveredConfidence.set("scan", confidence.id);
        return report;
      }
    }
    throw new Error("Unable to generate a unique Scan Subject report.");
  }

  generateMemory({ targetMention, witnessText }) {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const family = choose(
        this.history,
        "memory:family",
        MEMORY_FAMILY_POOLS,
        this.random,
      );
      const dossier = choose(
        this.history,
        `memory:${family.id}:dossier`,
        family.dossiers,
        this.random,
      );
      const confidence = choose(
        this.history,
        "memory:confidence",
        MEMORY_CONFIDENCE,
        this.random,
      );
      const witnessTemplate = choose(
        this.history,
        "memory:witness-template",
        MEMORY_WITNESS_TEMPLATES,
        this.random,
      );
      const witnessSentence = witnessTemplate.render(
        sentenceCaseSubject(witnessText),
      );
      const narrative =
        `During ${dossier.period}, Bureau records place you at ${dossier.location}. ` +
        `${witnessSentence}\n\n` +
        `The wipe order says the Bureau intervened because ${dossier.reason}.`;
      const signature = [
        dossier.id,
        witnessTemplate.id,
        confidence.id,
      ].join("|");
      const report = finalizeReport(
        "memory",
        {
          title: "UNAUTHORIZED MEMORY RECOVERY",
          description:
            `**Subject:** ${targetMention}\n` +
            `**File:** \`${caseNumber("MEM", this.random)}\`\n\n` +
            "Agent J recovered the case file. Against his advice, it still has audio.\n\n" +
            `${narrative}`,
          fields: [
            {
              name: "Memory classification",
              value: titleCaseId(dossier.familyId),
              inline: true,
            },
            {
              name: "Evidence recovered",
              value: `${sentenceCaseSubject(dossier.evidenceItem)}.`,
              inline: false,
            },
            {
              name: "Residual symptom",
              value: dossier.residualSymptom,
              inline: false,
            },
            {
              name: "Recommended treatment",
              value: dossier.treatment,
              inline: false,
            },
            {
              name: "Recovery confidence",
              value: confidence.text,
              inline: false,
            },
          ],
          footer: choose(
            this.history,
            "memory:footer",
            MEMORY_FOOTERS,
            this.random,
          ).text,
        },
        signature,
        {
          scenarioId: dossier.familyId,
          dossierId: dossier.id,
        },
      );
      if (
        report.length <= 1_800 &&
        !this.history.hasRecentSignature("memory", signature) &&
        this.lastDeliveredScenario.get("memory") !== family.id &&
        this.lastDeliveredConfidence.get("memory") !== confidence.id
      ) {
        this.history.recordSignature("memory", signature);
        this.lastDeliveredScenario.set("memory", family.id);
        this.lastDeliveredConfidence.set("memory", confidence.id);
        return report;
      }
    }
    throw new Error("Unable to generate a unique Memory Audit report.");
  }

  generateThreat({ targetMention }) {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const scenario = choose(
        this.history,
        "threat:scenario",
        ALL_THREAT_SCENARIOS,
        this.random,
      );
      const tier = scenario.tier;
      const intro = chooseText(
        this.history,
        `threat:${scenario.id}:intro`,
        scenario.id,
        "intro",
        scenario.intros,
        this.random,
      );
      const classification = chooseText(
        this.history,
        `threat:${scenario.id}:classification`,
        scenario.id,
        "classification",
        scenario.classification,
        this.random,
      );
      const capability = chooseText(
        this.history,
        `threat:${scenario.id}:capability`,
        scenario.id,
        "capability",
        scenario.capability,
        this.random,
      );
      const attack = chooseText(
        this.history,
        `threat:${scenario.id}:attack`,
        scenario.id,
        "attack",
        scenario.attack,
        this.random,
      );
      const defense = chooseText(
        this.history,
        `threat:${scenario.id}:defense`,
        scenario.id,
        "defense",
        scenario.defense,
        this.random,
      );
      const weakness = chooseText(
        this.history,
        `threat:${scenario.id}:weakness`,
        scenario.id,
        "weakness",
        scenario.weakness,
        this.random,
      );
      const casualty = chooseText(
        this.history,
        `threat:${scenario.id}:casualty`,
        scenario.id,
        "casualty",
        scenario.casualty,
        this.random,
      );
      const protocol = chooseText(
        this.history,
        `threat:${scenario.id}:containment`,
        scenario.id,
        "containment",
        scenario.containment,
        this.random,
      );
      const survival = this.random.int(
        scenario.survivalRange.min,
        scenario.survivalRange.max + 1,
      );
      const signature = [
        tier,
        scenario.id,
        intro.id,
        classification.id,
        capability.id,
        attack.id,
        defense.id,
        weakness.id,
        casualty.id,
        protocol.id,
      ].join("|");
      const report = finalizeReport(
        "threat",
        {
          title: "INTERGALACTIC THREAT ASSESSMENT",
          description:
            `**Subject:** ${targetMention}\n` +
            `**Assessment:** \`${caseNumber("THREAT", this.random)}\`\n\n` +
            `${intro.text}\n\n` +
            `**Threat tier:** ${tier}`,
          fields: [
            {
              name: "Threat classification",
              value: classification.text,
              inline: false,
            },
            {
              name: "Combat capability",
              value: capability.text,
              inline: false,
            },
            {
              name: "Primary attack",
              value: attack.text,
              inline: true,
            },
            {
              name: "Defensive response",
              value: defense.text,
              inline: true,
            },
            {
              name: "Known weakness",
              value: weakness.text,
              inline: true,
            },
            {
              name: "Likely casualty",
              value: casualty.text,
              inline: true,
            },
            {
              name: "Containment protocol",
              value: protocol.text,
              inline: false,
            },
            {
              name: "Mission success probability",
              value: `${survival}%`,
              inline: true,
            },
          ],
          footer: choose(
            this.history,
            "threat:footer",
            THREAT_FOOTERS,
            this.random,
          ).text,
        },
        signature,
        { scenarioId: scenario.id, tier },
      );
      if (
        report.length <= 1_500 &&
        !this.history.hasRecentSignature("threat", signature) &&
        this.lastDeliveredScenario.get("threat") !== scenario.id
      ) {
        this.history.recordSignature("threat", signature);
        this.lastDeliveredScenario.set("threat", scenario.id);
        return report;
      }
    }
    throw new Error("Unable to generate a unique Threat Assessment.");
  }
}

export function validateReport(report) {
  const rendered = [
    report.title,
    report.description,
    ...report.fields.flatMap((field) => [field.name, field.value]),
    report.footer,
  ].join("\n");
  const problems = [];
  if (rendered.includes("undefined")) problems.push("undefined");
  if (/[{}]/.test(rendered)) problems.push("unresolved brace");
  if (/@everyone|@here/i.test(rendered)) problems.push("mass mention");
  if (/[!?.,;:]{2,}/.test(rendered)) problems.push("double punctuation");
  if (/<@[^0-9][^>]*>/.test(rendered)) problems.push("malformed mention");
  if (/<@\d+>\s+were\b/i.test(rendered)) {
    problems.push("mention perspective mismatch");
  }
  if (/(?:\uFFFD|Ã¢â‚¬|Ãƒ.|Ã‚.)/u.test(rendered)) {
    problems.push("mojibake");
  }
  if (!report.composition?.scenarioId) {
    problems.push("missing scenario metadata");
  }
  if (report.fields.some((field) => !field.name || !field.value)) {
    problems.push("blank field");
  }
  if (report.title.length > 256) problems.push("title limit");
  if ((report.description?.length ?? 0) > 4_096) {
    problems.push("description limit");
  }
  if (report.fields.length > 25) problems.push("field count limit");
  if (report.fields.some((field) => field.name.length > 256)) {
    problems.push("field name limit");
  }
  if (report.fields.some((field) => field.value.length > 1_024)) {
    problems.push("field value limit");
  }
  if ((report.footer?.length ?? 0) > 2_048) {
    problems.push("footer limit");
  }
  if (reportLength(report) > 6_000) problems.push("embed total limit");
  return problems;
}

export { reportLength };
