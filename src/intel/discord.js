import {
  AttachmentBuilder,
  EmbedBuilder,
} from "discord.js";

import {
  downloadTrustedMedia,
  extensionForMedia,
} from "../media.js";

const MAX_MEDIA_BYTES = 8 * 1024 * 1024;
export const EARTH_INTEL_REGISTRY_MARKER = "earth-intel:source-registry:v1";

const STATUS = Object.freeze({
  "early-report": {
    label: "Early Report",
    color: 0xf0a23b,
    explanation: "Fast initial reporting; details may change.",
  },
  developing: {
    label: "Developing",
    color: 0xe7c44f,
    explanation: "More than one independent source family is reporting it.",
  },
  corroborated: {
    label: "Corroborated",
    color: 0x4aa3df,
    explanation: "Independent high-quality reporting substantially agrees.",
  },
  confirmed: {
    label: "Confirmed",
    color: 0x38b26d,
    explanation: "Official evidence and independent reporting agree.",
  },
  "official-claim": {
    label: "Official Report",
    color: 0x5865f2,
    explanation: "Published by the responsible authority; claims remain attributed.",
  },
  corrected: {
    label: "Corrected",
    color: 0x9b59b6,
    explanation: "A material correction supersedes an earlier report.",
  },
  disputed: {
    label: "Disputed",
    color: 0xd9534f,
    explanation: "Credible sources materially disagree.",
  },
});

const QUALIFICATION_REASONS = Object.freeze({
  "direct-us-impact": "Direct U.S. impact",
  "consequential-us-government-action":
    "Consequential U.S. government action",
  "major-global-shock": "Major global-impact event",
  "exceptional-space-uap": "Exceptional space/UAP significance",
});

function clipped(value, maximum) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text.length <= maximum
    ? text
    : `${text.slice(0, Math.max(0, maximum - 1)).trimEnd()}…`;
}

function candidateTimestamp(candidate) {
  const value = Date.parse(candidate.publishedAt);
  return Number.isFinite(value) ? value : Date.now();
}

function statusFor(candidate, reliabilityLabel) {
  const base = STATUS[reliabilityLabel] ?? STATUS["early-report"];
  if (reliabilityLabel !== "official-claim") {
    return base;
  }
  if (candidate.source?.key === "usgs") {
    return {
      ...base,
      label: "Confirmed Observation",
      explanation:
        "An authoritative instrumental event record; impact details may still change.",
    };
  }
  if (candidate.source?.key === "nhc") {
    return {
      ...base,
      label: "Official Advisory",
      explanation:
        "An official forecast/advisory, not a guarantee of future conditions.",
    };
  }
  if (
    candidate.source?.key === "nws" ||
    candidate.source?.key === "noaa-space-weather"
  ) {
    return {
      ...base,
      label: "Official Alert",
      explanation:
        "An active warning or alert from the responsible authority.",
    };
  }
  return base;
}

function qualificationText(decision) {
  const reasons = decision?.eligibility?.qualifyingReasons ?? [];
  return reasons.length > 0
    ? reasons
        .map((reason) => QUALIFICATION_REASONS[reason] ?? reason)
        .join(" • ")
    : "Update to an existing qualifying story";
}

function sourceLine(candidate, supportFamilyCount) {
  const label = candidate.source?.label ?? candidate.sourceKey ?? "Unknown";
  const authority = candidate.source?.authority;
  const independent =
    supportFamilyCount > 1
      ? ` • ${supportFamilyCount} independent source families`
      : "";
  return `${label}${authority ? ` (${authority})` : ""}${independent}`;
}

async function attachFirstTrustedImage(embed, candidate) {
  const media = (candidate.media ?? []).find(
    (entry) => entry?.kind === "image" && entry.url,
  );
  if (!media) {
    return [];
  }
  try {
    const downloaded = await downloadTrustedMedia(
      media.url,
      MAX_MEDIA_BYTES,
    );
    if (!downloaded.contentType.startsWith("image/")) {
      return [];
    }
    const extension = extensionForMedia(downloaded.contentType, media.url);
    const filename = `earth-intel-${candidate.eventId ?? "media"}.${extension}`;
    embed.setImage(`attachment://${filename}`);
    return [
      new AttachmentBuilder(downloaded.buffer, {
        name: filename,
      }),
    ];
  } catch {
    return [];
  }
}

export async function buildEarthIntelPayload({
  candidate,
  decision,
  supportFamilyCount = 1,
}) {
  const status = statusFor(candidate, decision.reliability.label);
  const embed = new EmbedBuilder()
    .setColor(status.color)
    .setAuthor({
      name: `EARTH INTEL • ${status.label}`,
    })
    .setTitle(clipped(candidate.title, 256) || "Developing report")
    .setURL(candidate.canonicalUrl ?? candidate.url)
    .setDescription(
      clipped(candidate.summary ?? candidate.text ?? candidate.title, 3_600),
    )
    .addFields(
      {
        name: "Reliability",
        value: clipped(status.explanation, 1_024),
      },
      {
        name: "Why this reached the channel",
        value: qualificationText(decision),
      },
      {
        name: "Source",
        value: `${sourceLine(candidate, supportFamilyCount)}\n[Open the original report](${candidate.canonicalUrl ?? candidate.url})`,
      },
    )
    .setFooter({
      text: "US-first • low-noise • updates stay with one story • no pings",
    })
    .setTimestamp(candidateTimestamp(candidate));
  const files = await attachFirstTrustedImage(embed, candidate);
  return {
    content: `🌎 **EARTH INTEL** · ${status.label}`,
    embeds: [embed],
    files,
    allowedMentions: { parse: [] },
  };
}

export function buildEarthIntelUpdatePayload({
  candidate,
  decision,
  supportFamilyCount,
}) {
  const status = statusFor(candidate, decision.reliability.label);
  const embed = new EmbedBuilder()
    .setColor(status.color)
    .setAuthor({ name: `STORY UPDATE • ${status.label}` })
    .setTitle(clipped(candidate.title, 256) || "Update")
    .setURL(candidate.canonicalUrl ?? candidate.url)
    .setDescription(
      clipped(candidate.summary ?? candidate.text ?? candidate.title, 3_500),
    )
    .addFields(
      {
        name: "Source",
        value: sourceLine(candidate, supportFamilyCount),
      },
      {
        name: "Original",
        value: `[Open report](${candidate.canonicalUrl ?? candidate.url})`,
      },
    )
    .setFooter({ text: "Earth Intel update • no pings" })
    .setTimestamp(candidateTimestamp(candidate));
  return {
    embeds: [embed],
    allowedMentions: { parse: [] },
  };
}

function sourceList(sources, kind) {
  return sources
    .filter((source) => source.kind === kind)
    .map((source) => `• **${source.label}**${source.handle ? ` — @${source.handle}` : ""}`)
    .join("\n");
}

export function buildEarthIntelRegistryPayload(sources) {
  const social = sourceList(sources, "social");
  const official = sourceList(sources, "official");
  const embed = new EmbedBuilder()
    .setColor(0x1f6f8b)
    .setTitle("🌎 Earth Intel — Source Registry & Scope")
    .setDescription(
      [
        "A **U.S.-first exception feed** for consequential breaking events. Regional foreign news remains silent unless the United States is directly involved or the event has major global consequences.",
        "",
        "**Normal target:** 1–5 new story cards daily. After six, only confirmed or critical events may create another card. Follow-ups remain in the original discussion thread.",
      ].join("\n"),
    )
    .addFields(
      {
        name: "Fast discovery and newsroom confirmation",
        value: social || "_None configured._",
      },
      {
        name: "Credential-free official event feeds",
        value: official || "_None configured._",
      },
      {
        name: "Reliability labels",
        value:
          "**Early Report** → **Developing** → **Corroborated** → **Confirmed**\nOfficial claims, advisories, corrections, and disputes remain explicitly labeled.",
      },
      {
        name: "Publication gate",
        value:
          "Direct U.S. impact • consequential U.S. government action • major global shock • exceptional space/UAP significance",
      },
      {
        name: "Suppressed by default",
        value:
          "Routine foreign politics, ordinary crime, incremental battlefield chatter, commentary, routine weather, and posts that merely say “BREAKING.”",
      },
      {
        name: "Transport and privacy",
        value:
          "X monitoring currently uses public Nitter RSS with **no X account, cookies, password, or API token**. Official feeds are fetched directly from their agencies.",
      },
    )
    .setFooter({
      text: `${EARTH_INTEL_REGISTRY_MARKER} • updated automatically when sources change`,
    })
    .setTimestamp();
  return {
    embeds: [embed],
    allowedMentions: { parse: [] },
  };
}

export function buildEarthIntelTestPayload() {
  const embed = new EmbedBuilder()
    .setColor(0x7b8794)
    .setAuthor({ name: "EARTH INTEL • SYSTEM TEST" })
    .setTitle("This is a test of the Earth Intel alert format")
    .setDescription(
      "This card is **not a real breaking-news event**. It verifies embeds, links, reactions, discussion threads, reliability labeling, and mention suppression.",
    )
    .addFields(
      {
        name: "Reliability",
        value:
          "System Test — no factual claim is being made.",
      },
      {
        name: "Expected behavior",
        value:
          "No role or user is pinged. Members may react here and comment inside the attached thread.",
      },
    )
    .setFooter({ text: "Earth Intel test • no pings" })
    .setTimestamp();
  return {
    content: "🧪 **EARTH INTEL SYSTEM TEST — NOT A REAL ALERT**",
    embeds: [embed],
    allowedMentions: { parse: [] },
  };
}

export function earthIntelThreadName(title) {
  const clean = clipped(title, 82)
    .replace(/[@#]/g, "")
    .trim();
  return clean ? `Intel: ${clean}`.slice(0, 100) : "Earth Intel discussion";
}

export function buildIntelHealthNotification({
  severity,
  title,
  description,
  details = [],
  recovered = false,
}) {
  const embed = new EmbedBuilder()
    .setColor(recovered ? 0x38b26d : severity === "critical" ? 0xd9534f : 0xf0a23b)
    .setTitle(`${recovered ? "✅" : severity === "critical" ? "🚨" : "⚠️"} ${clipped(title, 240)}`)
    .setDescription(clipped(description, 3_500))
    .setFooter({ text: "Agent K • Earth Intel diagnostics" })
    .setTimestamp();
  if (details.length > 0) {
    embed.addFields({
      name: "Diagnostics",
      value: clipped(details.join("\n"), 1_024),
    });
  }
  return {
    embeds: [embed],
    allowedMentions: { parse: [] },
  };
}

function relativeHealthTime(value) {
  if (!value) {
    return "never";
  }
  return `<t:${Math.floor(value / 1_000)}:R>`;
}

export function buildIntelHealthReportPayload(snapshot) {
  const sourceStates = snapshot.store?.sources ?? [];
  const healthy = sourceStates.filter(
    (source) => source.consecutiveFailures === 0 && source.lastSuccessAt,
  ).length;
  const failed = sourceStates.filter(
    (source) => source.consecutiveFailures > 0,
  );
  const newestSuccess = Math.max(
    0,
    ...sourceStates.map((source) => source.lastSuccessAt ?? 0),
  );
  const nitter = snapshot.nitter ?? {};
  const embed = new EmbedBuilder()
    .setColor(
      failed.length === 0 && nitter.status === "healthy"
        ? 0x38b26d
        : failed.length >= 3 || nitter.status === "unavailable"
          ? 0xd9534f
          : 0xf0a23b,
    )
    .setTitle("🌎 Earth Intel Health")
    .addFields(
      {
        name: "Runtime",
        value: [
          `Enabled: **${snapshot.enabled ? "yes" : "no"}**`,
          `Poll active: **${snapshot.polling ? "yes" : "no"}**`,
          `Configured sources: **${snapshot.sourceCount}**`,
          `Healthy initialized sources: **${healthy}/${sourceStates.length}**`,
          `Latest successful poll: ${relativeHealthTime(newestSuccess)}`,
        ].join("\n"),
        inline: true,
      },
      {
        name: "X transport",
        value: [
          `Nitter pool: **${nitter.status ?? "unknown"}**`,
          `Available mirrors: **${nitter.availableInstances ?? 0}/${nitter.instances?.length ?? 0}**`,
          "Credentials: **none**",
        ].join("\n"),
        inline: true,
      },
      {
        name: "Open incidents",
        value:
          (snapshot.store?.incidents ?? []).length > 0
            ? snapshot.store.incidents
                .map((incident) => `• ${incident.incidentKey} (${incident.severity})`)
                .join("\n")
                .slice(0, 1_024)
            : "None",
      },
      {
        name: "Source failures",
        value:
          failed.length > 0
            ? failed
                .map(
                  (source) =>
                    `• ${source.sourceKey}: ${source.consecutiveFailures} — ${source.lastError ?? "unknown"}`,
                )
                .join("\n")
                .slice(0, 1_024)
            : "None",
      },
    )
    .setFooter({
      text: "Read-only diagnostic • no X account, cookies, or API token",
    })
    .setTimestamp();
  return {
    embeds: [embed],
    allowedMentions: { parse: [] },
  };
}
