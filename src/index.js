import {
  ActionRowBuilder,
  Client,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  MessageFlags,
  Partials,
  PermissionFlagsBits,
  Routes,
  StringSelectMenuBuilder,
  escapeMarkdown,
} from "discord.js";

import {
  ARCHIVE_EMOJI,
  archiveHeader,
  archiveLogContext,
  buildArchivePayload,
} from "./archive.js";
import { AutomationStore } from "./automation-store.js";
import {
  BUMP_CREW_JOIN_CUSTOM_ID,
  BUMP_CREW_LEAVE_CUSTOM_ID,
  buildBumpAcknowledgement,
  buildBumpReminderPayload,
  dueBumpReminderSlot,
  isSuccessfulDisboardBump,
} from "./bump-reminders.js";
import {
  buildCitationCustomId,
  isCitationCustomId,
  parseCitationCustomId,
} from "./citation-id.js";
import { loadRuntimeConfig } from "./config.js";
import { CitationLedger } from "./ledger.js";
import { logError, logInfo } from "./logger.js";
import { EarthIntelMonitor } from "./intel/monitor.js";
import { buildIntelHealthReportPayload } from "./intel/discord.js";
import { createNitterTransport } from "./intel/nitter-transport.js";
import { EarthIntelStore } from "./intel/store.js";
import {
  NITTER_SOURCES,
  buildNitterAlertPayload,
  fetchNitterItems,
  isNitterStatusUrl,
} from "./nitter.js";
import { getOffenseOptions, OFFENSES, pickOffense } from "./offenses.js";
import { buildRecordEmbed, displayName } from "./records.js";
import { isFieldClearanceReaction } from "./reaction-role.js";
import { createAgentResponseSelector } from "./responses.js";
import {
  ISSUE_CITATION_COMMAND_NAME,
  EARTH_INTEL_HEALTH_COMMAND_NAME,
  VIEW_CITATION_RECORD_COMMAND_NAME,
} from "./register-commands.js";

const config = loadRuntimeConfig();
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.Reaction],
});
const ledger = new CitationLedger(config.databasePath);
const automationStore = new AutomationStore(config.automationDatabasePath);
const earthIntelStore = new EarthIntelStore(config.earthIntelDatabasePath);
const earthIntelNitterTransport = createNitterTransport({
  instances: config.earthIntelNitterInstances,
});
const earthIntelMonitor = new EarthIntelMonitor({
  client,
  config,
  store: earthIntelStore,
  nitterTransport: earthIntelNitterTransport,
  logInfo,
  logError,
});
const lastCitationAt = new Map();
const lastAgentResponseAt = new Map();
const archiveInFlight = new Set();
const selectAgentResponse = createAgentResponseSelector();
let nitterPollInFlight = false;
let nitterPollTimer = null;
let bumpReminderTickInFlight = false;
let bumpReminderTimer = null;

function memberHasAllowedRole(interaction) {
  const roles = interaction.member?.roles?.cache;
  return (
    roles &&
    [...config.allowedRoleIds].some((roleId) => roles.has(roleId))
  );
}

function isAuthorized(interaction) {
  return Boolean(
    interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) ||
      interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages) ||
      memberHasAllowedRole(interaction),
  );
}

function cooldownRemaining(userId) {
  const elapsed = Date.now() - (lastCitationAt.get(userId) ?? 0);
  return Math.max(0, config.cooldownMs - elapsed);
}

function agentResponseKey(message) {
  return `${message.guildId}:${message.channelId}:${message.author.id}`;
}

function agentResponseCooldownRemaining(message) {
  const elapsed =
    Date.now() - (lastAgentResponseAt.get(agentResponseKey(message)) ?? 0);
  return Math.max(0, config.responseCooldownMs - elapsed);
}

async function isReplyToAgent(message) {
  if (!message.reference?.messageId || !client.user) {
    return false;
  }

  const cached = message.channel.messages.cache.get(message.reference.messageId);
  if (cached) {
    return cached.author.id === client.user.id;
  }

  try {
    const referenced = await message.fetchReference();
    return referenced.author.id === client.user.id;
  } catch {
    return false;
  }
}

async function handleAgentResponse(message) {
  if (
    !message.inGuild() ||
    message.guildId !== config.guildId ||
    message.author.bot ||
    message.webhookId ||
    !client.user
  ) {
    return;
  }

  const isDirect =
    message.mentions.users.has(client.user.id) ||
    (await isReplyToAgent(message));
  const selection = selectAgentResponse({
    content: message.content,
    isDirect,
  });
  if (!selection || agentResponseCooldownRemaining(message) > 0) {
    return;
  }

  const responseMessage = await message.reply({
    content: selection.response,
    allowedMentions: { parse: [], repliedUser: false },
  });
  lastAgentResponseAt.set(agentResponseKey(message), Date.now());
  logInfo("Agent response posted", {
    guildId: message.guildId,
    channelId: message.channelId,
    sourceMessageId: message.id,
    responseMessageId: responseMessage.id,
    targetUserId: message.author.id,
    responseKind: selection.kind,
  });
}

async function suppressReadybotNitterMessage(message) {
  if (
    !config.nitterMonitorEnabled ||
    message.guildId !== config.guildId ||
    message.channelId !== config.alertChannelId ||
    message.author.id !== config.readybotUserId
  ) {
    return false;
  }

  const isNitterAlert = message.embeds.some((embed) =>
    isNitterStatusUrl(embed.url),
  );
  if (!isNitterAlert) {
    return false;
  }

  const botPermissions = message.channel.permissionsFor(
    message.guild.members.me,
  );
  if (!botPermissions?.has(PermissionFlagsBits.ManageMessages)) {
    logInfo("Readybot Nitter duplicate left in place", {
      channelId: message.channelId,
      readybotMessageId: message.id,
      reason: "Agent K does not have Manage Messages in this channel.",
    });
    return false;
  }

  await message.delete();
  logInfo("Superseded Readybot Nitter alert removed", {
    channelId: message.channelId,
    readybotMessageId: message.id,
  });
  return true;
}

async function archiveSourceMessage(sourceMessage, starCount) {
  const archiveChannel = await client.channels.fetch(config.archiveChannelId);
  if (
    !archiveChannel?.isTextBased() ||
    !("send" in archiveChannel) ||
    !("messages" in archiveChannel)
  ) {
    throw new Error("The configured archive channel is not text-based.");
  }

  const existing = automationStore.getArchiveEntry(
    sourceMessage.guildId,
    sourceMessage.id,
  );
  if (existing) {
    try {
      const archiveMessage = await archiveChannel.messages.fetch(
        existing.archiveMessageId,
      );
      await archiveMessage.edit({
        content: archiveHeader(sourceMessage, starCount),
        allowedMentions: { parse: [] },
      });
      automationStore.setArchiveStarCount(
        sourceMessage.guildId,
        sourceMessage.id,
        starCount,
      );
      return archiveMessage;
    } catch {
      // If the archive copy was manually removed, recreate it below.
    }
  }

  const payload = await buildArchivePayload(sourceMessage, starCount);
  const archiveMessage = await archiveChannel.send(payload);
  const now = Date.now();
  automationStore.saveArchiveEntry({
    guildId: sourceMessage.guildId,
    sourceChannelId: sourceMessage.channelId,
    sourceMessageId: sourceMessage.id,
    archiveChannelId: archiveChannel.id,
    archiveMessageId: archiveMessage.id,
    starCount,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  });
  return archiveMessage;
}

async function handleArchiveReaction(reaction, user) {
  if (!config.archiveEnabled || user.bot) {
    return;
  }
  if (reaction.partial) {
    await reaction.fetch();
  }
  if (reaction.message.partial) {
    await reaction.message.fetch();
  }

  const sourceMessage = reaction.message;
  if (
    !sourceMessage.inGuild() ||
    sourceMessage.guildId !== config.guildId ||
    sourceMessage.channelId === config.archiveChannelId ||
    reaction.emoji.name !== ARCHIVE_EMOJI ||
    (reaction.count ?? 0) < 1
  ) {
    return;
  }

  const lockKey = `${sourceMessage.guildId}:${sourceMessage.id}`;
  if (archiveInFlight.has(lockKey)) {
    return;
  }
  archiveInFlight.add(lockKey);
  try {
    const archiveMessage = await archiveSourceMessage(
      sourceMessage,
      reaction.count ?? 1,
    );
    logInfo("Message archived", {
      ...archiveLogContext(sourceMessage),
      archiveChannelId: config.archiveChannelId,
      archiveMessageId: archiveMessage.id,
      starCount: reaction.count ?? 1,
    });
  } finally {
    archiveInFlight.delete(lockKey);
  }
}

async function hydrateReaction(reaction) {
  if (reaction.partial) {
    await reaction.fetch();
  }
  if (reaction.message.partial) {
    await reaction.message.fetch();
  }
}

async function handleFieldClearanceReaction(reaction, user, grant) {
  await hydrateReaction(reaction);
  const message = reaction.message;
  if (
    !isFieldClearanceReaction(
      {
        guildId: message.guildId,
        channelId: message.channelId,
        messageId: message.id,
        emojiName: reaction.emoji.name,
        userIsBot: user.bot,
      },
      config,
    )
  ) {
    return false;
  }

  const route = Routes.guildMemberRole(
    config.guildId,
    user.id,
    config.fieldClearanceRoleId,
  );
  const reason = grant
    ? "Self-service M.I.B. Field Clearance reaction added"
    : "Self-service M.I.B. Field Clearance reaction removed";
  if (grant) {
    await client.rest.put(route, { reason });
  } else {
    await client.rest.delete(route, { reason });
  }
  logInfo(
    grant
      ? "Field Clearance self-service role granted"
      : "Field Clearance self-service role removed",
    {
      guildId: config.guildId,
      channelId: message.channelId,
      messageId: message.id,
      userId: user.id,
      roleId: config.fieldClearanceRoleId,
    },
  );
  return true;
}

function isBumpCrewButton(interaction) {
  return (
    interaction.isButton() &&
    [
      BUMP_CREW_JOIN_CUSTOM_ID,
      BUMP_CREW_LEAVE_CUSTOM_ID,
    ].includes(interaction.customId)
  );
}

async function handleBumpCrewButton(interaction) {
  if (!interaction.inGuild() || interaction.guildId !== config.guildId) {
    await interaction.reply({
      content: "Bump Crew controls only work inside Aliens Anonymous.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const joining = interaction.customId === BUMP_CREW_JOIN_CUSTOM_ID;
  const route = Routes.guildMemberRole(
    config.guildId,
    interaction.user.id,
    config.bumpCrewRoleId,
  );
  if (joining) {
    await client.rest.put(route, {
      reason: "Member opted into manual DISBOARD reminders",
    });
  } else {
    await client.rest.delete(route, {
      reason: "Member opted out of manual DISBOARD reminders",
    });
  }
  logInfo(joining ? "Bump Crew role granted" : "Bump Crew role removed", {
    guildId: config.guildId,
    userId: interaction.user.id,
    roleId: config.bumpCrewRoleId,
  });
  await interaction.editReply({
    content: joining
      ? "📡 You joined **Bump Crew**. Agent K will ping the role at scheduled manual transmission windows."
      : "You left **Bump Crew**. Agent K has removed you from scheduled bump pings.",
  });
}

async function handleSuccessfulDisboardBump(message) {
  if (
    !config.bumpReminderEnabled ||
    message.guildId !== config.guildId ||
    !isSuccessfulDisboardBump(message, config.disboardUserId)
  ) {
    return false;
  }

  const isNew = automationStore.rememberDisboardBump({
    messageId: message.id,
    channelId: message.channelId,
    bumpedAt: message.createdTimestamp,
  });
  if (!isNew) {
    return true;
  }

  let acknowledgement = null;
  if (message.channelId === config.bumpReminderChannelId) {
    acknowledgement = await message.reply({
      content: buildBumpAcknowledgement({
        messageId: message.id,
        bumpedAt: message.createdTimestamp,
        cooldownMs: config.bumpCooldownMs,
      }),
      allowedMentions: { parse: [], repliedUser: false },
    });
  }
  logInfo("Successful DISBOARD bump recorded", {
    guildId: message.guildId,
    channelId: message.channelId,
    disboardMessageId: message.id,
    acknowledgementMessageId: acknowledgement?.id ?? null,
    bumpedAt: message.createdTimestamp,
  });
  return true;
}

async function runBumpReminderTick(now = new Date()) {
  if (!config.bumpReminderEnabled || bumpReminderTickInFlight) {
    return;
  }
  const slot = dueBumpReminderSlot({
    now,
    timeZone: config.bumpReminderTimeZone,
    times: config.bumpReminderTimes,
    graceMinutes: config.bumpReminderGraceMinutes,
  });
  if (!slot) {
    return;
  }

  bumpReminderTickInFlight = true;
  try {
    const claimed = automationStore.claimBumpReminder(
      slot.key,
      config.bumpReminderChannelId,
      now.getTime(),
    );
    if (!claimed) {
      return;
    }

    const latestBump = automationStore.getLatestDisboardBump();
    const cooldownRemaining = Math.max(
      0,
      (latestBump?.bumpedAt ?? 0) +
        config.bumpCooldownMs -
        now.getTime(),
    );
    if (cooldownRemaining > 0) {
      automationStore.completeBumpReminder(
        slot.key,
        {
          status: "skipped_cooldown",
          note: `DISBOARD cooldown had ${cooldownRemaining}ms remaining.`,
        },
        now.getTime(),
      );
      logInfo("Scheduled bump reminder skipped during active cooldown", {
        slotKey: slot.key,
        latestBumpMessageId: latestBump.messageId,
        cooldownRemaining,
      });
      return;
    }

    const channel = await client.channels.fetch(
      config.bumpReminderChannelId,
    );
    if (!channel?.isTextBased() || !("send" in channel)) {
      throw new Error("The configured bump reminder channel is not text-based.");
    }
    const reminder = await channel.send(
      buildBumpReminderPayload({
        roleId: config.bumpCrewRoleId,
        slotKey: slot.key,
        times: config.bumpReminderTimes,
        timeZone: config.bumpReminderTimeZone,
      }),
    );
    automationStore.completeBumpReminder(
      slot.key,
      { status: "sent", messageId: reminder.id },
      Date.now(),
    );
    logInfo("Scheduled bump reminder posted", {
      slotKey: slot.key,
      channelId: channel.id,
      reminderMessageId: reminder.id,
      roleId: config.bumpCrewRoleId,
    });
  } catch (error) {
    const slot = dueBumpReminderSlot({
      now,
      timeZone: config.bumpReminderTimeZone,
      times: config.bumpReminderTimes,
      graceMinutes: config.bumpReminderGraceMinutes,
    });
    if (slot && automationStore.getBumpReminder(slot.key)) {
      automationStore.completeBumpReminder(
        slot.key,
        {
          status: "failed",
          note: String(error?.message ?? error).slice(0, 500),
        },
        Date.now(),
      );
    }
    throw error;
  } finally {
    bumpReminderTickInFlight = false;
  }
}

async function pollNitterSource(channel, source) {
  const items = await fetchNitterItems(source);
  if (!automationStore.isFeedInitialized(source.key)) {
    automationStore.initializeFeed(source.key, items);
    logInfo("Nitter feed initialized without backfill", {
      sourceKey: source.key,
      itemCount: items.length,
    });
    return;
  }

  const unseen = items.filter(
    (item) => !automationStore.hasFeedItem(source.key, item.id),
  );
  if (unseen.length === 0) {
    return;
  }

  const sendable = unseen.slice(-config.nitterMaxItemsPerPoll);
  const skipped = unseen.slice(0, -sendable.length);
  for (const item of skipped) {
    automationStore.rememberFeedItem(source.key, item);
  }

  for (const item of sendable) {
    const alertMessage = await channel.send(
      await buildNitterAlertPayload(source, item),
    );
    automationStore.rememberFeedItem(source.key, item);
    logInfo("Nitter alert posted", {
      sourceKey: source.key,
      itemId: item.id,
      alertChannelId: channel.id,
      alertMessageId: alertMessage.id,
      hasMedia: Boolean(item.mediaUrl),
    });
  }
}

async function pollNitterFeeds() {
  if (!config.nitterMonitorEnabled || nitterPollInFlight) {
    return;
  }
  nitterPollInFlight = true;
  try {
    const channel = await client.channels.fetch(config.alertChannelId);
    if (!channel?.isTextBased() || !("send" in channel)) {
      throw new Error("The configured UAP alert channel is not text-based.");
    }

    for (const source of NITTER_SOURCES) {
      try {
        await pollNitterSource(channel, source);
      } catch (error) {
        logError("Nitter feed poll failed", error, {
          sourceKey: source.key,
          feedUrl: source.feedUrl,
        });
      }
    }
  } finally {
    nitterPollInFlight = false;
  }
}

function buildOffensePicker(customId) {
  const select = new StringSelectMenuBuilder()
    .setCustomId(customId)
    .setPlaceholder("Choose the alleged offense…")
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(getOffenseOptions());

  return new ActionRowBuilder().addComponents(select);
}

async function handleViewCitationRecord(interaction, targetUser, targetMember) {
  if (!interaction.inGuild()) {
    await interaction.reply({
      content: "Citation records can only be viewed inside the server.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply();
  const record = ledger.getRecord(interaction.guildId, targetUser.id, 8);
  logInfo("Citation record viewed", {
    guildId: interaction.guildId,
    viewerUserId: interaction.user.id,
    targetUserId: targetUser.id,
    total: record.total,
  });
  await interaction.editReply({
    embeds: [buildRecordEmbed(targetUser, targetMember, record)],
    allowedMentions: { parse: [] },
  });
}

async function handleIssueCitation(interaction) {
  if (!interaction.inGuild() || !interaction.targetMessage) {
    await interaction.reply({
      content: "Citations can only be issued against server messages.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (!isAuthorized(interaction)) {
    await interaction.reply({
      content: "The Citation Bureau does not recognize your badge.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const target = interaction.targetMessage;
  logInfo("Citation picker opened", {
    guildId: interaction.guildId,
    channelId: interaction.channelId,
    messageId: target.id,
    targetUserId: target.author.id,
    issuerUserId: interaction.user.id,
  });
  const customId = buildCitationCustomId({
    channelId: interaction.channelId,
    messageId: target.id,
    targetUserId: target.author.id,
    invokerId: interaction.user.id,
  });

  await interaction.editReply({
    content: `Choose a citation for **${escapeMarkdown(displayName(target.author, target.member))}**. Only you can see this picker.`,
    components: [buildOffensePicker(customId)],
  });
}

async function handleOffenseSelection(interaction) {
  logInfo("Offense selection received", {
    guildId: interaction.guildId,
    channelId: interaction.channelId,
    issuerUserId: interaction.user.id,
    offenseId: interaction.values[0],
  });
  const context = parseCitationCustomId(interaction.customId);
  if (!context) {
    await interaction.reply({
      content: "That citation form is invalid or expired.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (context.invokerId !== interaction.user.id) {
    await interaction.reply({
      content: "That citation form belongs to another moderator.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (!isAuthorized(interaction)) {
    await interaction.update({
      content: "Your Citation Bureau credentials are no longer valid.",
      components: [],
    });
    return;
  }

  const remaining = cooldownRemaining(interaction.user.id);
  if (remaining > 0) {
    await interaction.reply({
      content: `The paperwork printer is cooling down. Try again in ${Math.ceil(remaining / 1_000)} seconds.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const offenseId = interaction.values[0];
  if (!OFFENSES[offenseId]) {
    await interaction.update({
      content: "That offense is no longer in the bureau handbook.",
      components: [],
    });
    return;
  }

  if (
    context.channelId !== interaction.channelId ||
    !interaction.channel?.isTextBased() ||
    !("messages" in interaction.channel)
  ) {
    await interaction.update({
      content: "The original message channel is no longer available.",
      components: [],
    });
    return;
  }

  await interaction.deferUpdate();

  let targetMessage;
  try {
    targetMessage = await interaction.channel.messages.fetch(context.messageId);
  } catch {
    await interaction.editReply({
      content: "The original message was deleted before the citation could be filed.",
      components: [],
    });
    return;
  }

  if (targetMessage.author.id !== context.targetUserId) {
    await interaction.editReply({
      content: "The original message no longer matches this citation form.",
      components: [],
    });
    return;
  }

  const { offense, charge, sentence, finding } = pickOffense(offenseId);
  const citationFields = [
    {
      name: "Subject",
      value: escapeMarkdown(displayName(targetMessage.author, targetMessage.member)),
    },
    { name: "Charge", value: charge },
  ];
  if (finding) {
    citationFields.push({ name: "Bureau Finding", value: finding });
  }
  citationFields.push({ name: "Sentence", value: sentence });

  const embed = new EmbedBuilder()
    .setColor(offense.color)
    .setTitle(`🚨 ${offense.heading}`)
    .addFields(citationFields)
    .setFooter({ text: offense.footer });

  let citationMessage;
  try {
    citationMessage = await targetMessage.reply({
      embeds: [embed],
      allowedMentions: { parse: [], repliedUser: false },
    });
    ledger.add({
      guildId: interaction.guildId,
      channelId: targetMessage.channelId,
      sourceMessageId: targetMessage.id,
      citationMessageId: citationMessage.id,
      targetUserId: targetMessage.author.id,
      targetUsername: displayName(targetMessage.author, targetMessage.member),
      issuerUserId: interaction.user.id,
      issuerUsername: displayName(interaction.user, interaction.member),
      offenseId,
      offenseLabel: offense.menuLabel,
      charge,
      sentence,
      finding,
      createdAt: Date.now(),
    });
  } catch (error) {
    if (citationMessage) {
      await citationMessage.delete().catch(() => {});
    }
    logError("Failed to post or record citation", error, {
      guildId: interaction.guildId,
      channelId: interaction.channelId,
      sourceMessageId: targetMessage.id,
      issuerUserId: interaction.user.id,
    });
    await interaction.editReply({
      content:
        "The citation could not be filed. Check my channel permissions and local citation database.",
      components: [],
    });
    return;
  }

  lastCitationAt.set(interaction.user.id, Date.now());
  logInfo("Citation filed", {
    guildId: interaction.guildId,
    channelId: targetMessage.channelId,
    sourceMessageId: targetMessage.id,
    citationMessageId: citationMessage.id,
    targetUserId: targetMessage.author.id,
    issuerUserId: interaction.user.id,
    offenseId,
  });
  await interaction.editReply({
    content: `Citation filed for **${escapeMarkdown(displayName(targetMessage.author, targetMessage.member))}**.`,
    components: [],
  });
}

client.once(Events.ClientReady, (readyClient) => {
  logInfo("Citation Bureau online", { botTag: readyClient.user.tag });
  if (config.bumpReminderEnabled) {
    void runBumpReminderTick().catch((error) => {
      logError("Initial bump reminder check failed", error);
    });
    bumpReminderTimer = setInterval(() => {
      void runBumpReminderTick().catch((error) => {
        logError("Scheduled bump reminder check failed", error);
      });
    }, config.bumpReminderSchedulerIntervalMs);
  }
  if (config.nitterMonitorEnabled) {
    void pollNitterFeeds().catch((error) => {
      logError("Initial Nitter poll failed", error);
    });
    nitterPollTimer = setInterval(() => {
      void pollNitterFeeds().catch((error) => {
        logError("Scheduled Nitter poll failed", error);
      });
    }, config.nitterPollIntervalMs);
  }
  if (config.earthIntelEnabled) {
    void earthIntelMonitor.start().catch(async (error) => {
      logError("Earth Intel startup failed", error);
      await earthIntelMonitor
        .notifyOperational({
          incidentKey: "runtime:earth-intel-startup",
          severity: "critical",
          title: "Earth Intel could not start",
          description:
            "Agent K could not initialize the Earth Intel channel or source monitor. The citation, archive, and UAP features remain online.",
          details: [String(error?.message ?? error).slice(0, 500)],
        })
        .catch((notificationError) => {
          logError(
            "Earth Intel startup notification failed",
            notificationError,
          );
        });
    });
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (isBumpCrewButton(interaction)) {
      await handleBumpCrewButton(interaction);
      return;
    }

    if (
      interaction.isChatInputCommand() &&
      interaction.commandName === EARTH_INTEL_HEALTH_COMMAND_NAME
    ) {
      if (
        !interaction.memberPermissions?.has(
          PermissionFlagsBits.Administrator,
        )
      ) {
        await interaction.reply({
          content: "Earth Intel diagnostics require Administrator clearance.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      await interaction.reply({
        ...buildIntelHealthReportPayload(
          earthIntelMonitor.healthSnapshot(),
        ),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (
      interaction.isMessageContextMenuCommand() &&
      interaction.commandName === ISSUE_CITATION_COMMAND_NAME
    ) {
      await handleIssueCitation(interaction);
      return;
    }

    if (
      interaction.isMessageContextMenuCommand() &&
      interaction.commandName === VIEW_CITATION_RECORD_COMMAND_NAME
    ) {
      await handleViewCitationRecord(
        interaction,
        interaction.targetMessage.author,
        interaction.targetMessage.member,
      );
      return;
    }

    if (
      interaction.isUserContextMenuCommand() &&
      interaction.commandName === VIEW_CITATION_RECORD_COMMAND_NAME
    ) {
      await handleViewCitationRecord(
        interaction,
        interaction.targetUser,
        interaction.targetMember,
      );
      return;
    }

    if (
      interaction.isStringSelectMenu() &&
      isCitationCustomId(interaction.customId)
    ) {
      await handleOffenseSelection(interaction);
    }
  } catch (error) {
    logError("Citation interaction failed", error, {
      interactionId: interaction.id,
      interactionType: interaction.type,
      userId: interaction.user?.id,
    });
    const response = {
      content: "The Citation Bureau experienced a classified paperwork failure.",
      components: [],
      flags: MessageFlags.Ephemeral,
    };

    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(response).catch(() => {});
    } else {
      await interaction.reply(response).catch(() => {});
    }
  }
});

client.on(Events.MessageCreate, async (message) => {
  try {
    if (await handleSuccessfulDisboardBump(message)) {
      return;
    }
    if (await suppressReadybotNitterMessage(message)) {
      return;
    }
    await handleAgentResponse(message);
  } catch (error) {
    logError("Agent response failed", error, {
      guildId: message.guildId,
      channelId: message.channelId,
      sourceMessageId: message.id,
      targetUserId: message.author.id,
    });
  }
});

client.on(Events.MessageReactionAdd, async (reaction, user) => {
  try {
    if (await handleFieldClearanceReaction(reaction, user, true)) {
      return;
    }
    await handleArchiveReaction(reaction, user);
  } catch (error) {
    logError("Reaction handler failed", error, {
      guildId: reaction.message.guildId,
      channelId: reaction.message.channelId,
      sourceMessageId: reaction.message.id,
      reactingUserId: user.id,
    });
  }
});

client.on(Events.MessageReactionRemove, async (reaction, user) => {
  try {
    await handleFieldClearanceReaction(reaction, user, false);
  } catch (error) {
    logError("Reaction removal handler failed", error, {
      guildId: reaction.message.guildId,
      channelId: reaction.message.channelId,
      sourceMessageId: reaction.message.id,
      reactingUserId: user.id,
    });
  }
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    if (bumpReminderTimer) {
      clearInterval(bumpReminderTimer);
    }
    if (nitterPollTimer) {
      clearInterval(nitterPollTimer);
    }
    earthIntelMonitor.stop();
    earthIntelStore.close();
    automationStore.close();
    ledger.close();
    client.destroy();
    process.exit(0);
  });
}

client.login(config.token);
