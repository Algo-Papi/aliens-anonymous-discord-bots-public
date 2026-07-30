import { MessageFlags } from "discord.js";

import { authorizeResearch } from "../security/authorization.js";
import { formatRemaining } from "../security/cooldowns.js";
import {
  researchPreviewPayload,
  researchPublicPayload,
  researchQuestionModal,
  researchSetupPayload,
} from "./research-presentation.js";

const MENTIONS_SUPPRESSED = Object.freeze({ parse: [], users: [] });
const MODES = new Set(["fact_check", "ground", "research"]);
const SCOPES = new Set(["focused", "standard"]);
const TIERS = new Set(["standard", "deep"]);

function privatePayload(payload) {
  return {
    ...payload,
    flags: MessageFlags.Ephemeral,
    allowedMentions: MENTIONS_SUPPRESSED,
  };
}

export class ResearchInteractionController {
  constructor({
    client,
    config,
    sessions,
    limits,
    service,
    apiConfigured,
    logger,
  }) {
    this.client = client;
    this.config = config;
    this.sessions = sessions;
    this.limits = limits;
    this.service = service;
    this.apiConfigured = apiConfigured;
    this.logger = logger;
  }

  async #member(interaction) {
    // Research access can change while the bot is running. Force a REST fetch
    // so a stale gateway cache cannot deny a newly granted analyst role.
    return interaction.guild.members.fetch({
      user: interaction.user.id,
      force: true,
    });
  }

  async #authorization(
    interaction,
    channelId = interaction.channelId,
    parentChannelId = interaction.channel?.parentId ?? null,
  ) {
    const member = await this.#member(interaction);
    const authorization = authorizeResearch({
      enabled: this.config.research.enabled,
      member,
      researchRoleIds: this.config.research.roleIds,
      channelId,
      parentChannelId,
      researchChannelIds: this.config.research.channelIds,
      apiConfigured: this.apiConfigured,
    });
    if (!authorization.ok) {
      this.logger.info("research_authorization_denied", {
        code: authorization.code,
        guildId: interaction.guildId,
        channelId,
        userId: interaction.user.id,
        memberRoleIds: [...member.roles.cache.keys()],
        requiredRoleIds: [...this.config.research.roleIds],
      });
    }
    return authorization;
  }

  async #deny(interaction, message) {
    const payload = privatePayload({ content: message });
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(payload);
    } else {
      await interaction.reply(payload);
    }
  }

  async handleContext(interaction) {
    const authorization = await this.#authorization(interaction);
    if (!authorization.ok) {
      await this.#deny(interaction, authorization.message);
      return;
    }
    const session = this.sessions.create({
      userId: interaction.user.id,
      guildId: interaction.guildId,
      channelId: interaction.channelId,
      parentChannelId: interaction.channel?.parentId ?? null,
      anchorMessageId: interaction.targetMessage.id,
    });
    await interaction.reply(
      privatePayload(researchSetupPayload(session)),
    );
  }

  async handleSelect(interaction) {
    const [, field, sessionId] = interaction.customId.split(":");
    const session = this.sessions.get(sessionId, interaction.user.id);
    if (!session) {
      await this.#deny(interaction, "That research desk session expired.");
      return;
    }
    const authorization = await this.#authorization(
      interaction,
      session.channelId,
      session.parentChannelId,
    );
    if (!authorization.ok) {
      await this.#deny(interaction, authorization.message);
      return;
    }
    const value = interaction.values[0];
    if (
      (field === "mode" && MODES.has(value)) ||
      (field === "scope" && SCOPES.has(value)) ||
      (field === "tier" && TIERS.has(value))
    ) {
      this.sessions.update(session.id, interaction.user.id, {
        [field]: value,
        result: null,
      });
      await interaction.update(researchSetupPayload(session));
      return;
    }
    await this.#deny(interaction, "That research setting is invalid.");
  }

  async handleButton(interaction) {
    const [, action, sessionId] = interaction.customId.split(":");
    const session = this.sessions.get(sessionId, interaction.user.id);
    if (!session) {
      await this.#deny(interaction, "That research desk session expired.");
      return;
    }
    if (action === "discard") {
      this.sessions.delete(session.id, interaction.user.id);
      await interaction.update({
        content: "Research file discarded.",
        embeds: [],
        components: [],
        allowedMentions: MENTIONS_SUPPRESSED,
      });
      return;
    }
    const authorization = await this.#authorization(
      interaction,
      session.channelId,
      session.parentChannelId,
    );
    if (!authorization.ok) {
      await this.#deny(interaction, authorization.message);
      return;
    }
    if (action === "continue") {
      await interaction.showModal(researchQuestionModal(session));
      return;
    }
    if (action === "publish") {
      await this.#publish(interaction, session);
      return;
    }
    if (action === "rerun") {
      await this.#run(interaction, session, { update: true });
      return;
    }
    await this.#deny(interaction, "That research control is invalid.");
  }

  async handleModal(interaction) {
    const [, action, sessionId] = interaction.customId.split(":");
    if (action !== "submit") {
      return;
    }
    const session = this.sessions.get(sessionId, interaction.user.id);
    if (!session) {
      await this.#deny(interaction, "That research desk session expired.");
      return;
    }
    const authorization = await this.#authorization(
      interaction,
      session.channelId,
      session.parentChannelId,
    );
    if (!authorization.ok) {
      await this.#deny(interaction, authorization.message);
      return;
    }
    const question =
      interaction.fields.getTextInputValue("question")?.trim() || "";
    if (session.mode === "research" && !question) {
      await this.#deny(
        interaction,
        "Research-a-question mode requires a specific question.",
      );
      return;
    }
    this.sessions.update(session.id, interaction.user.id, {
      question,
      result: null,
    });
    await this.#run(interaction, session, { update: false });
  }

  async #anchor(session) {
    const channel =
      this.client.channels.cache.get(session.channelId) ??
      (await this.client.channels.fetch(session.channelId));
    if (!channel?.messages?.fetch) {
      throw new Error("Research channel is unavailable.");
    }
    return channel.messages.fetch(session.anchorMessageId);
  }

  async #run(interaction, session, { update }) {
    const reservation = this.limits.reserve(interaction.user.id);
    if (!reservation.ok) {
      const cooldown =
        reservation.remainingMs > 0
          ? ` Try again in **${formatRemaining(reservation.remainingMs)}**.`
          : "";
      await this.#deny(interaction, `${reservation.message}${cooldown}`);
      return;
    }

    if (update) {
      await interaction.deferUpdate();
      await interaction.editReply({
        content:
          `Agent J is running ${session.tier === "deep" ? "Deep Research with Terra" : "Standard Research with Luna"} and searching the live web. This can take up to 90 seconds.`,
        embeds: [],
        components: [],
        allowedMentions: MENTIONS_SUPPRESSED,
      });
    } else {
      await interaction.deferReply({
        flags: MessageFlags.Ephemeral,
      });
    }

    try {
      const result = await this.service.run({
        guildId: session.guildId,
        userId: session.userId,
        anchorMessage: await this.#anchor(session),
        mode: session.mode,
        scope: session.scope,
        tier: session.tier,
        question: session.question,
      });
      this.sessions.update(session.id, interaction.user.id, { result });
      this.limits.complete(reservation.token);
      await interaction.editReply(researchPreviewPayload(session));
    } catch (error) {
      this.limits.release(reservation.token);
      this.logger.error("research_failed", error, {
        guildId: session.guildId,
        channelId: session.channelId,
        mode: session.mode,
        scope: session.scope,
        tier: session.tier,
        code: error?.code ?? "UNKNOWN",
      });
      await interaction.editReply({
        content:
          error?.message ||
          "Agent J could not complete the live research run.",
        embeds: [],
        components: [],
        allowedMentions: MENTIONS_SUPPRESSED,
      });
    }
  }

  async #publish(interaction, session) {
    if (!session.result) {
      await this.#deny(interaction, "There is no verified brief to publish.");
      return;
    }
    await interaction.deferUpdate();
    try {
      const anchor = await this.#anchor(session);
      const published = await anchor.reply(researchPublicPayload(session));
      this.logger.info("research_published", {
        guildId: session.guildId,
        channelId: session.channelId,
        messageId: published.id,
        mode: session.mode,
        scope: session.scope,
        tier: session.tier,
        sourceCount: session.result.sources.length,
      });
      this.sessions.delete(session.id, interaction.user.id);
      await interaction.editReply({
        content: `Brief published as a reply to the selected message: ${published.url}`,
        embeds: [],
        components: [],
        allowedMentions: MENTIONS_SUPPRESSED,
      });
    } catch (error) {
      this.logger.error("research_publish_failed", error, {
        guildId: session.guildId,
        channelId: session.channelId,
      });
      await this.#deny(
        interaction,
        "The researched brief is still in preview, but Agent J could not post the public reply.",
      );
    }
  }
}
