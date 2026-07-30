import "dotenv/config";

import { execFileSync } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const CREDENTIAL_TARGET = "MIB Discord Bot Suite - Agent J Token";
export const OPENAI_CREDENTIAL_TARGET =
  "MIB Discord Bot Suite - Agent J OpenAI Key";

function requiredValue(name, value) {
  const normalized = value?.trim();
  if (!normalized) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return normalized;
}

function parseIdSet(value) {
  return new Set(
    (value ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  );
}

function parseBoolean(value, fallback = false) {
  if (value == null || value.trim() === "") {
    return fallback;
  }
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function parsePositiveInteger(value, fallback, maximum = Number.MAX_SAFE_INTEGER) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(parsed, maximum);
}

function defaultDataDirectory() {
  if (process.platform === "win32" && process.env.LOCALAPPDATA) {
    return join(process.env.LOCALAPPDATA, "AliensAnonymous", "AgentJ");
  }
  return join(homedir(), ".local", "share", "AliensAnonymous", "AgentJ");
}

export function resolveDataDirectory() {
  return process.env.AGENT_J_DATA_DIR?.trim() || defaultDataDirectory();
}

export function loadToken() {
  const environmentToken = process.env.AGENT_J_DISCORD_TOKEN?.trim();
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
      // Fall through to the actionable error below.
    }
  }

  throw new Error(
    "Missing Agent J token. Store it with scripts/Set-DiscordTokenFromClipboard.ps1 or set AGENT_J_DISCORD_TOKEN for this process.",
  );
}

export function loadOptionalOpenAIKey() {
  const environmentKey =
    process.env.AGENT_J_OPENAI_API_KEY?.trim();
  if (environmentKey) {
    return environmentKey;
  }

  if (process.platform === "win32") {
    const credentialScript = fileURLToPath(
      new URL("../scripts/Get-OpenAIKey.ps1", import.meta.url),
    );
    try {
      const key = execFileSync(
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
      return key || null;
    } catch {
      return null;
    }
  }

  return null;
}

function loadSharedConfig() {
  const dataDirectory = resolveDataDirectory();
  const standardResearchModel =
    process.env.AGENT_J_RESEARCH_STANDARD_MODEL?.trim() ||
    "gpt-5.6-luna";
  const deepResearchModel =
    process.env.AGENT_J_RESEARCH_DEEP_MODEL?.trim() ||
    "gpt-5.6-terra";
  return {
    clientId: requiredValue(
      "AGENT_J_CLIENT_ID",
      process.env.AGENT_J_CLIENT_ID,
    ),
    guildId: requiredValue(
      "AGENT_J_GUILD_ID",
      process.env.AGENT_J_GUILD_ID,
    ),
    accessRoleIds: parseIdSet(process.env.AGENT_J_ACCESS_ROLE_IDS),
    protectedRoleIds: parseIdSet(process.env.AGENT_J_PROTECTED_ROLE_IDS),
    arenaChannelId: process.env.AGENT_J_ARENA_CHANNEL_ID?.trim() || "",
    arenaResultsChannelId:
      process.env.AGENT_J_ARENA_RESULTS_CHANNEL_ID?.trim() || "",
    arenaCleanupDelayMs:
      parsePositiveInteger(
        process.env.AGENT_J_ARENA_CLEANUP_SECONDS,
        300,
        3_600,
      ) * 1_000,
    testChannelId: process.env.AGENT_J_TEST_CHANNEL_ID?.trim() || "",
    allowOptedOutInvokers: parseBoolean(
      process.env.AGENT_J_ALLOW_OPTED_OUT_INVOKERS,
      false,
    ),
    research: {
      enabled: parseBoolean(process.env.AGENT_J_RESEARCH_ENABLED, false),
      roleIds: parseIdSet(process.env.AGENT_J_RESEARCH_ROLE_IDS),
      channelIds: parseIdSet(process.env.AGENT_J_RESEARCH_CHANNEL_IDS),
      standardModel: standardResearchModel,
      deepModel: deepResearchModel,
      // Compatibility alias for diagnostics that still display one model.
      model: standardResearchModel,
      timeoutMs:
        parsePositiveInteger(
          process.env.AGENT_J_RESEARCH_TIMEOUT_SECONDS,
          90,
          120,
        ) * 1_000,
      focusedMessageLimit: parsePositiveInteger(
        process.env.AGENT_J_RESEARCH_FOCUSED_MESSAGE_LIMIT,
        10,
        10,
      ),
      standardMessageLimit: parsePositiveInteger(
        process.env.AGENT_J_RESEARCH_STANDARD_MESSAGE_LIMIT,
        25,
        25,
      ),
      focusedCharacterLimit: parsePositiveInteger(
        process.env.AGENT_J_RESEARCH_FOCUSED_CHARACTER_LIMIT,
        6_000,
        6_000,
      ),
      standardCharacterLimit: parsePositiveInteger(
        process.env.AGENT_J_RESEARCH_STANDARD_CHARACTER_LIMIT,
        12_000,
        12_000,
      ),
      sessionTtlMs: 15 * 60 * 1_000,
      cooldownMs: 60 * 1_000,
      maxConcurrentJobs: 2,
    },
    dataDirectory,
    databasePath: join(dataDirectory, "agent-j.sqlite"),
    logPath: join(dataDirectory, "logs", "agent-j.log"),
  };
}

export function loadRuntimeConfig() {
  const shared = loadSharedConfig();
  return {
    ...shared,
    token: loadToken(),
    openAIKey: shared.research.enabled ? loadOptionalOpenAIKey() : null,
  };
}

export function loadRegistrationConfig() {
  const shared = loadSharedConfig();
  return {
    token: loadToken(),
    clientId: shared.clientId,
    guildId: shared.guildId,
  };
}

export function loadDiagnosticConfig() {
  return {
    ...loadSharedConfig(),
    openAIKeyConfigured: Boolean(loadOptionalOpenAIKey()),
  };
}
