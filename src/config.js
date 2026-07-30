import "dotenv/config";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { parseBumpReminderTimes } from "./bump-reminders.js";

function requiredValue(name, value) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalValue(value) {
  return value?.trim() || "";
}

function requiredWhen(enabled, name, value) {
  const normalized = optionalValue(value);
  if (enabled && !normalized) {
    throw new Error(
      `Missing required environment variable for an enabled feature: ${name}`,
    );
  }
  return normalized;
}

function requireAllOrNone(entries) {
  const configured = entries.filter(([, value]) => optionalValue(value));
  if (configured.length > 0 && configured.length < entries.length) {
    const missing = entries
      .filter(([, value]) => !optionalValue(value))
      .map(([name]) => name)
      .join(", ");
    throw new Error(
      `Incomplete optional feature configuration. Missing: ${missing}`,
    );
  }
}

function loadToken() {
  const environmentToken = process.env.DISCORD_TOKEN?.trim();
  if (environmentToken) {
    return environmentToken;
  }

  if (process.platform === "win32") {
    const credentialScript = fileURLToPath(
      new URL("../scripts/Get-DiscordToken.ps1", import.meta.url),
    );
    try {
      const token = execFileSync(
        "powershell.exe",
        [
          "-NoLogo",
          "-NoProfile",
          "-NonInteractive",
          "-ExecutionPolicy",
          "Bypass",
          "-File",
          credentialScript,
        ],
        {
          encoding: "utf8",
          stdio: ["ignore", "pipe", "ignore"],
          windowsHide: true,
        },
      ).trim();
      if (token) {
        return token;
      }
    } catch {
      // Fall through to the actionable configuration error below.
    }
  }

  throw new Error(
    "Missing Discord token. Set DISCORD_TOKEN or run scripts/Set-DiscordTokenFromClipboard.ps1 on Windows.",
  );
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseBoolean(value, fallback) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  return !["0", "false", "no", "off"].includes(
    String(value).trim().toLowerCase(),
  );
}

function parseHttpsUrlList(value, fallback) {
  const entries = String(value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  const selected = entries.length > 0 ? entries : fallback;
  for (const entry of selected) {
    const url = new URL(entry);
    if (url.protocol !== "https:" || url.username || url.password) {
      throw new Error(
        "Earth Intel Nitter instances must be credential-free HTTPS URLs.",
      );
    }
  }
  return selected;
}

export function loadRuntimeConfig() {
  const archiveEnabled = parseBoolean(process.env.ARCHIVE_ENABLED, false);
  const nitterMonitorEnabled = parseBoolean(
    process.env.NITTER_MONITOR_ENABLED,
    false,
  );
  const earthIntelEnabled = parseBoolean(
    process.env.EARTH_INTEL_ENABLED,
    false,
  );
  const bumpReminderEnabled = parseBoolean(
    process.env.BUMP_REMINDER_ENABLED,
    false,
  );
  const reactionRoleEntries = [
    ["Q_AND_A_CHANNEL_ID", process.env.Q_AND_A_CHANNEL_ID],
    ["FIELD_CLEARANCE_ROLE_ID", process.env.FIELD_CLEARANCE_ROLE_ID],
    ["FIELD_CLEARANCE_MESSAGE_ID", process.env.FIELD_CLEARANCE_MESSAGE_ID],
  ];
  requireAllOrNone(reactionRoleEntries);

  return {
    token: loadToken(),
    clientId: requiredValue(
      "DISCORD_CLIENT_ID",
      process.env.DISCORD_CLIENT_ID?.trim(),
    ),
    guildId: requiredValue(
      "DISCORD_GUILD_ID",
      process.env.DISCORD_GUILD_ID?.trim(),
    ),
    allowedRoleIds: new Set(
      (process.env.CITATION_ROLE_IDS ?? "")
        .split(",")
        .map((roleId) => roleId.trim())
        .filter(Boolean),
    ),
    cooldownMs:
      parsePositiveInteger(process.env.CITATION_COOLDOWN_SECONDS, 15) * 1_000,
    responseCooldownMs:
      parsePositiveInteger(process.env.CHAT_RESPONSE_COOLDOWN_SECONDS, 5) *
      1_000,
    archiveEnabled,
    archiveChannelId: requiredWhen(
      archiveEnabled,
      "ARCHIVE_CHANNEL_ID",
      process.env.ARCHIVE_CHANNEL_ID,
    ),
    nitterMonitorEnabled,
    alertChannelId: requiredWhen(
      nitterMonitorEnabled,
      "UAP_ALERT_CHANNEL_ID",
      process.env.UAP_ALERT_CHANNEL_ID,
    ),
    readybotUserId: optionalValue(process.env.READYBOT_USER_ID),
    nitterPollIntervalMs:
      parsePositiveInteger(
        process.env.NITTER_POLL_INTERVAL_SECONDS,
        600,
      ) * 1_000,
    nitterMaxItemsPerPoll: parsePositiveInteger(
      process.env.NITTER_MAX_ITEMS_PER_POLL,
      3,
    ),
    earthIntelEnabled,
    earthIntelChannelId: requiredWhen(
      earthIntelEnabled,
      "EARTH_INTEL_CHANNEL_ID",
      process.env.EARTH_INTEL_CHANNEL_ID,
    ),
    earthIntelOpsChannelId:
      optionalValue(process.env.EARTH_INTEL_OPS_CHANNEL_ID),
    qAndAChannelId: optionalValue(process.env.Q_AND_A_CHANNEL_ID),
    fieldClearanceRoleId:
      optionalValue(process.env.FIELD_CLEARANCE_ROLE_ID),
    fieldClearanceMessageId:
      optionalValue(process.env.FIELD_CLEARANCE_MESSAGE_ID),
    bumpReminderEnabled,
    bumpReminderChannelId: requiredWhen(
      bumpReminderEnabled,
      "BUMP_REMINDER_CHANNEL_ID",
      process.env.BUMP_REMINDER_CHANNEL_ID,
    ),
    bumpCrewRoleId: requiredWhen(
      bumpReminderEnabled,
      "BUMP_CREW_ROLE_ID",
      process.env.BUMP_CREW_ROLE_ID,
    ),
    disboardUserId: requiredWhen(
      bumpReminderEnabled,
      "DISBOARD_USER_ID",
      process.env.DISBOARD_USER_ID,
    ),
    bumpReminderTimeZone:
      process.env.BUMP_REMINDER_TIME_ZONE?.trim() ||
      "America/New_York",
    bumpReminderTimes: parseBumpReminderTimes(
      process.env.BUMP_REMINDER_TIMES,
    ),
    bumpReminderGraceMinutes: parsePositiveInteger(
      process.env.BUMP_REMINDER_GRACE_MINUTES,
      10,
    ),
    bumpReminderSchedulerIntervalMs:
      parsePositiveInteger(
        process.env.BUMP_REMINDER_SCHEDULER_INTERVAL_SECONDS,
        30,
      ) * 1_000,
    bumpCooldownMs:
      parsePositiveInteger(
        process.env.DISBOARD_BUMP_COOLDOWN_SECONDS,
        7_380,
      ) * 1_000,
    fieldClearanceEmoji:
      process.env.FIELD_CLEARANCE_EMOJI?.trim() || "🕶️",
    earthIntelOwnerUserId:
      process.env.EARTH_INTEL_OWNER_USER_ID?.trim() || null,
    earthIntelSchedulerIntervalMs:
      parsePositiveInteger(
        process.env.EARTH_INTEL_SCHEDULER_INTERVAL_SECONDS,
        60,
      ) * 1_000,
    earthIntelDailySoftCap: parsePositiveInteger(
      process.env.EARTH_INTEL_DAILY_SOFT_CAP,
      6,
    ),
    earthIntelMaxItemsPerSourcePerCycle: parsePositiveInteger(
      process.env.EARTH_INTEL_MAX_ITEMS_PER_SOURCE_PER_CYCLE,
      5,
    ),
    earthIntelNitterInstances: parseHttpsUrlList(
      process.env.EARTH_INTEL_NITTER_INSTANCES,
      ["https://nitter.net"],
    ),
    databasePath:
      process.env.CITATION_DB_PATH?.trim() ||
      fileURLToPath(new URL("../data/citations.sqlite", import.meta.url)),
    automationDatabasePath:
      process.env.AUTOMATION_DB_PATH?.trim() ||
      fileURLToPath(new URL("../data/automation.sqlite", import.meta.url)),
    earthIntelDatabasePath:
      process.env.EARTH_INTEL_DB_PATH?.trim() ||
      fileURLToPath(new URL("../data/earth-intel.sqlite", import.meta.url)),
  };
}

export function loadRegistrationConfig() {
  return {
    token: loadToken(),
    clientId: requiredValue(
      "DISCORD_CLIENT_ID",
      process.env.DISCORD_CLIENT_ID?.trim(),
    ),
    guildId: requiredValue(
      "DISCORD_GUILD_ID",
      process.env.DISCORD_GUILD_ID?.trim(),
    ),
  };
}
