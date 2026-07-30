import {
  ActivityType,
  Client,
  GatewayIntentBits,
  Partials,
} from "discord.js";

import { RecentActivity } from "./activity/recent-activity.js";
import { ArenaStore } from "./arena/arena-store.js";
import { InteractionController } from "./commands/controller.js";
import { ResearchInteractionController } from "./commands/research-controller.js";
import { ReportGenerator } from "./content/reports.js";
import { loadRuntimeConfig } from "./config.js";
import { openDatabase } from "./db/database.js";
import { UserStore } from "./db/user-store.js";
import { EconomyStore } from "./economy/economy-store.js";
import { createLogger } from "./logger.js";
import { OpenAIResearchClient } from "./research/openai-client.js";
import { ResearchService } from "./research/service.js";
import { ResearchSessions } from "./research/sessions.js";
import { ReportCooldowns } from "./security/cooldowns.js";
import { ResearchLimits } from "./security/research-limits.js";

const config = loadRuntimeConfig();
const logger = createLogger(config.logPath);
const database = openDatabase(config.databasePath);
const userStore = new UserStore(database);
const economyStore = new EconomyStore(database);
const arenaStore = new ArenaStore(database);
const recentActivity = new RecentActivity();
const cooldowns = new ReportCooldowns();
const reportGenerator = new ReportGenerator();
const researchSessions = new ResearchSessions({
  ttlMs: config.research.sessionTtlMs,
});
const researchLimits = new ResearchLimits({
  cooldownMs: config.research.cooldownMs,
  maxConcurrentJobs: config.research.maxConcurrentJobs,
});
const researchProvider =
  config.research.enabled && config.openAIKey
    ? new OpenAIResearchClient({
        apiKey: config.openAIKey,
        standardModel: config.research.standardModel,
        deepModel: config.research.deepModel,
        timeoutMs: config.research.timeoutMs,
      })
    : null;
const researchService = researchProvider
  ? new ResearchService({
      config,
      userStore,
      provider: researchProvider,
      logger,
    })
  : null;
const interruptedMatches = arenaStore.cancelInterruptedOnStartup();

const intents = [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages];
if (config.research.enabled) {
  intents.push(GatewayIntentBits.MessageContent);
}
const client = new Client({
  intents,
  partials: [Partials.Channel, Partials.Message],
});

const researchController = new ResearchInteractionController({
  client,
  config,
  sessions: researchSessions,
  limits: researchLimits,
  service: researchService,
  apiConfigured: Boolean(researchProvider),
  logger,
});
const controller = new InteractionController({
  client,
  config,
  userStore,
  economyStore,
  arenaStore,
  recentActivity,
  cooldowns,
  reportGenerator,
  researchController,
  logger,
});

let sweeperTimer = null;
let sweeperRunning = false;
let shuttingDown = false;

client.once("ready", async () => {
  client.user.setPresence({
    activities: [
      {
        name: "the Blacksite Arena",
        type: ActivityType.Watching,
      },
    ],
    status: "online",
  });
  logger.info("agent_j_ready", {
    clientId: client.user.id,
    guildId: config.guildId,
    researchEnabled: config.research.enabled,
    researchApiConfigured: Boolean(researchProvider),
    researchRoleCount: config.research.roleIds.size,
    researchChannelCount: config.research.channelIds.size,
    researchStandardModel: config.research.standardModel,
    researchDeepModel: config.research.deepModel,
    arenaResultsChannelId: config.arenaResultsChannelId || null,
    arenaCleanupDelaySeconds: config.arenaCleanupDelayMs / 1_000,
  });

  for (const match of interruptedMatches) {
    await controller.handleSweeperTransition(match);
  }
  await controller.archivePendingCompletedMatches();
  await controller.sweepArenaMessageCleanup();

  sweeperTimer = setInterval(async () => {
    if (sweeperRunning) {
      return;
    }
    sweeperRunning = true;
    try {
      for (const transition of arenaStore.sweepExpired()) {
        await controller.handleSweeperTransition(transition);
      }
      await controller.archivePendingCompletedMatches();
      await controller.sweepArenaMessageCleanup();
    } finally {
      sweeperRunning = false;
    }
  }, 15_000);
  sweeperTimer.unref();
});

client.on("messageCreate", (message) => {
  if (
    !message.guildId ||
    message.guildId !== config.guildId ||
    message.author.bot ||
    message.webhookId
  ) {
    return;
  }
  recentActivity.record({
    guildId: message.guildId,
    channelId: message.channelId,
    userId: message.author.id,
  });
});

client.on("messageDelete", (message) => {
  if (!message.guildId || !message.id) {
    return;
  }
  const cancelled = arenaStore.cancelByMessage(
    message.guildId,
    message.channelId,
    message.id,
  );
  if (cancelled) {
    logger.info("arena_message_deleted", {
      guildId: message.guildId,
      channelId: message.channelId,
      matchId: cancelled.id,
    });
  }
});

client.on("interactionCreate", async (interaction) => {
  try {
    await controller.handle(interaction);
  } catch (error) {
    logger.error("interaction_failed", error, {
      guildId: interaction.guildId,
      channelId: interaction.channelId,
      userId: interaction.user?.id,
      commandName: interaction.commandName,
    });
    if (!interaction.isRepliable()) {
      return;
    }
    const payload = {
      content:
        "Agent J hit a classified error and is pretending that was intentional.",
      flags: 64,
      allowedMentions: { parse: [], users: [] },
    };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload).catch(() => {});
    } else {
      await interaction.reply(payload).catch(() => {});
    }
  }
});

client.on("error", (error) => {
  logger.error("discord_client_error", error);
});

async function shutdown(signal) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  if (sweeperTimer) {
    clearInterval(sweeperTimer);
  }
  logger.info("agent_j_shutdown", { signal });
  client.destroy();
  database.close();
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    shutdown(signal)
      .catch((error) => {
        logger.error("shutdown_failed", error, { signal });
      })
      .finally(() => {
        process.exit(0);
      });
  });
}

client.login(config.token).catch((error) => {
  logger.error("login_failed", error);
  database.close();
  process.exitCode = 1;
});
