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
} from "./pools.js";
import { ContentHistory } from "./history.js";
import { RandomSource } from "./random.js";
import {
  MEMORY_OPENERS,
  pickVoice,
  REPORT_FOOTERS,
  SCAN_OPENERS,
  THREAT_OPENERS,
} from "./voice.js";

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
      `${witness} witnessed the event, signed the wrong nondisclosure form, and has been nervous around ceiling fans ever since.`,
    (witness) =>
      `${witness} provided corroborating testimony after being assured the probe sketches would remain sealed.`,
    (witness) =>
      `${witness} was recovered nearby wearing one shoe, two tracking devices, and somebody else's expression.`,
    (witness) =>
      `${witness} remembers the incident clearly because the neuralyzer flashed backward and restored a worse memory.`,
    (witness) =>
      `${witness} identified the subject from a lineup containing three clones and an unusually confident cadaver.`,
    (witness) =>
      `${witness} attempted to leave the scene but discovered the scene had followed them home.`,
    (witness) =>
      `${witness} filed an eyewitness statement, a medical claim, and one request to be transferred to a quieter timeline.`,
    (witness) =>
      `${witness} confirmed every detail before entering witness protection inside a condemned vending machine.`,
  ],
);

export const MEMORY_SOLO_TEMPLATES = renderEntries("memory-solo", [
  () =>
    "A fictional Bureau contractor listed only as Kevin declined to identify which half of the story was his fault.",
  () =>
    "The only other witness was a rental clone whose deposit had already been forfeited.",
  () =>
    "Surveillance footage shows an unidentified intern quietly resigning through a locked emergency exit.",
  () =>
    "A dead livestock inspector corroborated the account through channels Legal refuses to describe.",
  () =>
    "No civilian witness survived with an intact calendar, so the Bureau interviewed the motel ice machine.",
  () =>
    "The scene was otherwise empty except for one Worm Guy pretending to be load-bearing.",
  () =>
    "A government Roomba recorded the event, developed religion, and erased itself.",
  () =>
    "The backup witness turned out to be the subject wearing a cheaper disguise and tomorrow's shoes.",
]);

function choose(history, key, pool, random) {
  return history.choose(key, pool, random);
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

function finalizeReport(command, report, signature, history) {
  const length = reportLength(report);
  return {
    ...report,
    command,
    signature,
    length,
    color: REPORT_COLORS[command],
    allowedMentions: { parse: [], users: [] },
  };
}

function compatibleWithTier(entry, tier) {
  return entry.tiers?.includes(tier);
}

function chooseTiered(
  history,
  key,
  pool,
  tier,
  random,
  { contradiction = false } = {},
) {
  let compatible = pool.filter((entry) =>
    contradiction
      ? !compatibleWithTier(entry, tier)
      : compatibleWithTier(entry, tier),
  );
  if (compatible.length === 0) {
    compatible = pool;
  }
  return choose(history, `${key}:tier-${tier}`, compatible, random);
}

export class ReportGenerator {
  constructor({
    random = new RandomSource(),
    history = new ContentHistory(),
  } = {}) {
    this.random = random;
    this.history = history;
  }

  generateScan({ targetMention, witnessText }) {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const family =
        OBSERVATION_FAMILIES[
          this.random.int(0, OBSERVATION_FAMILIES.length)
        ];
      const species = choose(
        this.history,
        "scan:species",
        SPECIES,
        this.random,
      );
      const origin = choose(
        this.history,
        "scan:origin",
        ORIGINS,
        this.random,
      );
      const anomaly = choose(
        this.history,
        "scan:anomaly",
        ANOMALIES,
        this.random,
      );
      const threat = choose(
        this.history,
        "scan:threat",
        SCAN_THREATS,
        this.random,
      );
      const weakness = choose(
        this.history,
        "scan:weakness",
        SCAN_WEAKNESSES,
        this.random,
      );
      const disposition = choose(
        this.history,
        "scan:disposition",
        DISPOSITIONS,
        this.random,
      );
      const confidence = choose(
        this.history,
        "scan:confidence",
        SCAN_CONFIDENCE,
        this.random,
      );
      const reaction = choose(
        this.history,
        `scan:${family.id}:reaction`,
        family.reactions,
        this.random,
      );
      const action = choose(
        this.history,
        `scan:${family.id}:action`,
        family.actions,
        this.random,
      );
      const outcome = choose(
        this.history,
        `scan:${family.id}:outcome`,
        family.outcomes,
        this.random,
      );
      const observation = family.render(
        witnessText,
        targetMention,
        reaction.text,
        action.text,
        outcome.text,
      );
      const signature = [
        species.id,
        origin.id,
        anomaly.id,
        threat.id,
        weakness.id,
        disposition.id,
        family.id,
        reaction.id,
        action.id,
        outcome.id,
      ].join("|");
      const report = finalizeReport(
        "scan",
        {
          title: "M.I.B. XENOBIOLOGICAL SCAN",
          description:
            `**Subject:** ${targetMention}\n` +
            `**Case:** \`${caseNumber("XENO", this.random)}\`\n\n` +
            pickVoice(SCAN_OPENERS, this.random),
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
            REPORT_FOOTERS.scan,
            this.random,
          ).text,
        },
        signature,
        this.history,
      );
      if (
        report.length <= 1_800 &&
        !this.history.hasRecentSignature("scan", signature)
      ) {
        this.history.recordSignature("scan", signature);
        return report;
      }
    }
    throw new Error("Unable to generate a unique Scan Subject report.");
  }

  generateMemory({ targetMention, witnessText }) {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const family =
        MEMORY_FAMILIES[
          this.random.int(0, MEMORY_FAMILIES.length)
        ];
      const period = choose(
        this.history,
        "memory:period",
        MEMORY_PERIODS,
        this.random,
      );
      const location = choose(
        this.history,
        "memory:location",
        MEMORY_LOCATIONS,
        this.random,
      );
      const incident = choose(
        this.history,
        `memory:${family.id}:incident`,
        family.incidents,
        this.random,
      );
      const escalation = choose(
        this.history,
        `memory:${family.id}:escalation`,
        family.escalations,
        this.random,
      );
      const reason = choose(
        this.history,
        "memory:reason",
        MEMORY_REASONS,
        this.random,
      );
      const evidence = choose(
        this.history,
        "memory:evidence",
        MEMORY_EVIDENCE,
        this.random,
      );
      const residual = choose(
        this.history,
        "memory:residual",
        MEMORY_RESIDUALS,
        this.random,
      );
      const treatment = choose(
        this.history,
        "memory:treatment",
        MEMORY_TREATMENTS,
        this.random,
      );
      const confidence = choose(
        this.history,
        "memory:confidence",
        MEMORY_CONFIDENCE,
        this.random,
      );
      const usesWitness = this.random.chance(0.6);
      const witnessTemplate = choose(
        this.history,
        usesWitness ? "memory:witness-template" : "memory:solo-template",
        usesWitness ? MEMORY_WITNESS_TEMPLATES : MEMORY_SOLO_TEMPLATES,
        this.random,
      );
      const witnessSentence = witnessTemplate.render(witnessText);
      const narrative =
        `During ${period.text}, ${targetMention} ${incident.text} at ${location.text}. ` +
        `${witnessSentence} ${escalation.text}\n\n` +
        `The Bureau erased the event because ${reason.text}. ` +
        `The evidence locker still contains ${evidence.text}.`;
      const signature = [
        family.id,
        period.id,
        location.id,
        incident.id,
        escalation.id,
        reason.id,
        evidence.id,
        residual.id,
        treatment.id,
      ].join("|");
      const report = finalizeReport(
        "memory",
        {
          title: "UNAUTHORIZED MEMORY RECOVERY",
          description:
            `**Subject:** ${targetMention}\n` +
            `**File:** \`${caseNumber("MEM", this.random)}\`\n\n` +
            `${pickVoice(MEMORY_OPENERS, this.random)}\n\n${narrative}`,
          fields: [
            {
              name: "Reason for neuralyzation",
              value: reason.text,
              inline: false,
            },
            {
              name: "Residual symptom",
              value: residual.text,
              inline: false,
            },
            {
              name: "Recommended treatment",
              value: treatment.text,
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
            REPORT_FOOTERS.memory,
            this.random,
          ).text,
        },
        signature,
        this.history,
      );
      if (
        report.length <= 1_800 &&
        !this.history.hasRecentSignature("memory", signature)
      ) {
        this.history.recordSignature("memory", signature);
        return report;
      }
    }
    throw new Error("Unable to generate a unique Memory Audit report.");
  }

  generateThreat({ targetMention }) {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const tier = this.random.int(0, 6);
      const contradiction = this.random.chance(0.2);
      const classification = chooseTiered(
        this.history,
        "threat:classification",
        THREAT_CLASSIFICATIONS,
        tier,
        this.random,
      );
      const capability = chooseTiered(
        this.history,
        "threat:capability",
        COMBAT_CAPABILITIES,
        tier,
        this.random,
      );
      const attack = chooseTiered(
        this.history,
        "threat:attack",
        PRIMARY_ATTACKS,
        tier,
        this.random,
        { contradiction },
      );
      const defense = chooseTiered(
        this.history,
        "threat:defense",
        DEFENSIVE_RESPONSES,
        tier,
        this.random,
      );
      const weakness = chooseTiered(
        this.history,
        "threat:weakness",
        THREAT_WEAKNESSES,
        tier,
        this.random,
      );
      const casualty = chooseTiered(
        this.history,
        "threat:casualty",
        LIKELY_CASUALTIES,
        tier,
        this.random,
      );
      const protocol = chooseTiered(
        this.history,
        "threat:protocol",
        CONTAINMENT_PROTOCOLS,
        tier,
        this.random,
      );
      const confidence = choose(
        this.history,
        "threat:sensor-confidence",
        SENSOR_CONFIDENCE,
        this.random,
      );
      const ranges = [
        [85, 101],
        [70, 96],
        [45, 86],
        [20, 71],
        [5, 46],
        [1, 26],
      ];
      const [min, max] = ranges[tier];
      const survival = this.random.int(min, max);
      const signature = [
        tier,
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
            `${pickVoice(THREAT_OPENERS, this.random)}\n\n` +
            `Agent J rates this subject Tier ${tier}. ${
              contradiction
                ? "One reading is catastrophically inconsistent, which somehow makes the file worse."
                : "The numbers agree, and none of them are flattering."
            }`,
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
              name: "Survival probability",
              value: `${survival}%`,
              inline: true,
            },
            {
              name: "Sensor confidence",
              value: confidence.text,
              inline: false,
            },
          ],
          footer: choose(
            this.history,
            "threat:footer",
            REPORT_FOOTERS.threat,
            this.random,
          ).text,
        },
        signature,
        this.history,
      );
      if (
        report.length <= 1_500 &&
        !this.history.hasRecentSignature("threat", signature)
      ) {
        this.history.recordSignature("threat", signature);
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
  if (report.fields.some((field) => !field.name || !field.value)) {
    problems.push("blank field");
  }
  return problems;
}

export { reportLength };
