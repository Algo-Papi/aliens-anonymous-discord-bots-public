import { MessageFlags } from "discord.js";

import { displayTactic } from "../arena/rules.js";
import { getItem } from "../economy/catalog.js";
import {
  authorizeArenaChallenge,
  authorizeReport,
  isEligibleWitness,
  memberHasAccess,
} from "../security/authorization.js";
import { formatRemaining } from "../security/cooldowns.js";
import { COMMANDS } from "./definitions.js";
import {
  MENTIONS_SUPPRESSED,
  arenaMessagePayload,
  arenaRoundResultPayload,
  arenaRulesPayload,
  arenaTurnPromptPayload,
  cosmeticsPayload,
  equipmentSelectionPayload,
  inventoryPayload,
  privacyPayload,
  profilePayload,
  reportEmbed,
  shopPayload,
  tacticSelectionPayload,
} from "./presentation.js";

const REPORT_COMMANDS = new Map([
  [COMMANDS.scan, "scan"],
  [COMMANDS.memory, "memory"],
  [COMMANDS.threat, "threat"],
]);
const TERMINAL_ARENA_STATUSES = new Set([
  "complete",
  "declined",
  "expired",
  "abandoned",
  "technical_cancel",
]);

function privateReply(payload) {
  return {
    ...payload,
    flags: MessageFlags.Ephemeral,
    allowedMentions: MENTIONS_SUPPRESSED,
  };
}

function errorMessage(error) {
  if (error?.until) {
    return `${error.message} Try again <t:${Math.floor(
      new Date(error.until).getTime() / 1_000,
    )}:R>.`;
  }
  return error?.message || "Agent J misplaced that file.";
}

export function arenaControlBelongsToMatch({
  action,
  match,
  guildId,
  channelId,
  messageId,
}) {
  if (
    match.guild_id !== guildId ||
    match.channel_id !== channelId
  ) {
    return false;
  }

  // Tactic buttons live on a private interaction response, so their message
  // ID cannot equal the public Arena card's message ID. Participant,
  // match-status, deadline, and tactic validation still run server-side.
  if (action === "tactic" || action === "gadget") {
    return true;
  }

  if (action === "open") {
    return Boolean(match.control_message_id) &&
      match.control_message_id === messageId;
  }

  return !match.message_id || match.message_id === messageId;
}

export class InteractionController {
  constructor({
    client,
    config,
    userStore,
    arenaStore,
    economyStore,
    recentActivity,
    cooldowns,
    reportGenerator,
    researchController = null,
    logger,
  }) {
    this.client = client;
    this.config = config;
    this.userStore = userStore;
    this.arenaStore = arenaStore;
    this.economyStore = economyStore;
    this.recentActivity = recentActivity;
    this.cooldowns = cooldowns;
    this.reportGenerator = reportGenerator;
    this.researchController = researchController;
    this.logger = logger;
  }

  async handle(interaction) {
    if (!interaction.inGuild() || interaction.guildId !== this.config.guildId) {
      if (interaction.isRepliable()) {
        await interaction.reply(
          privateReply({
            content: "Agent J is not assigned to this server.",
          }),
        );
      }
      return;
    }

    if (
      interaction.isUserContextMenuCommand() ||
      interaction.isMessageContextMenuCommand()
    ) {
      if (
        interaction.isMessageContextMenuCommand() &&
        interaction.commandName === COMMANDS.research &&
        this.researchController
      ) {
        await this.researchController.handleContext(interaction);
        return;
      }
      if (REPORT_COMMANDS.has(interaction.commandName)) {
        await this.#handleReport(
          interaction,
          REPORT_COMMANDS.get(interaction.commandName),
        );
        return;
      }
      if (interaction.commandName === COMMANDS.challenge) {
        await this.#handleChallenge(interaction);
      }
      return;
    }

    if (interaction.isChatInputCommand()) {
      if (
        interaction.commandName === COMMANDS.agentJ &&
        interaction.options.getSubcommand() === "privacy"
      ) {
        await this.#showPrivacy(interaction);
        return;
      }
      if (
        interaction.commandName === COMMANDS.arena
      ) {
        await this.#handleArenaSlash(interaction);
      }
      return;
    }

    if (interaction.isButton()) {
      if (
        interaction.customId.startsWith("research:") &&
        this.researchController
      ) {
        await this.researchController.handleButton(interaction);
        return;
      }
      if (interaction.customId.startsWith("privacy:")) {
        await this.#handlePrivacyButton(interaction);
        return;
      }
      if (interaction.customId.startsWith("arena:")) {
        await this.#handleArenaButton(interaction);
        return;
      }
      if (interaction.customId.startsWith("shop:")) {
        await this.#handleShopButton(interaction);
        return;
      }
      if (interaction.customId.startsWith("cosmetic:")) {
        await this.#handleCosmeticButton(interaction);
      }
      return;
    }

    if (
      interaction.isStringSelectMenu() &&
      interaction.customId.startsWith("research:") &&
      this.researchController
    ) {
      await this.researchController.handleSelect(interaction);
      return;
    }

    if (
      interaction.isModalSubmit() &&
      interaction.customId.startsWith("research:") &&
      this.researchController
    ) {
      await this.researchController.handleModal(interaction);
    }
  }

  async #membersForReport(interaction) {
    const invoker =
      interaction.member?.roles?.cache
        ? interaction.member
        : await interaction.guild.members.fetch(interaction.user.id);
    const targetId =
      interaction.targetMessage?.author?.id ?? interaction.targetId;
    const target =
      interaction.targetMember?.roles?.cache
        ? interaction.targetMember
        : interaction.targetMessage?.member?.roles?.cache
          ? interaction.targetMessage.member
          : interaction.guild.members.cache.get(targetId) ??
            (await interaction.guild.members.fetch(targetId));
    return { invoker, target };
  }

  #privacy(guildId, userId) {
    return this.userStore.getPrivacy(guildId, userId);
  }

  #authorize(invoker, target) {
    return authorizeReport({
      invoker,
      target,
      botUserId: this.client.user.id,
      accessRoleIds: this.config.accessRoleIds,
      protectedRoleIds: this.config.protectedRoleIds,
      invokerPrivacy: this.#privacy(invoker.guild.id, invoker.id),
      targetPrivacy: this.#privacy(target.guild.id, target.id),
      allowOptedOutInvokers: this.config.allowOptedOutInvokers,
    });
  }

  async #witness(interaction, invoker, target) {
    return this.recentActivity.selectWitness({
      guildId: interaction.guildId,
      channelId: interaction.channelId,
      invokerId: invoker.id,
      targetId: target.id,
      isEligible: async (userId) => {
        const member = interaction.guild.members.cache.get(userId);
        if (!member) {
          return false;
        }
        return isEligibleWitness({
          member,
          accessRoleIds: this.config.accessRoleIds,
          protectedRoleIds: this.config.protectedRoleIds,
          privacy: this.#privacy(interaction.guildId, userId),
        });
      },
    });
  }

  async #handleReport(interaction, command) {
    const { invoker, target } = await this.#membersForReport(interaction);
    const authorization = this.#authorize(invoker, target);
    if (!authorization.ok) {
      await interaction.reply(
        privateReply({ content: authorization.message }),
      );
      return;
    }

    const reservation = this.cooldowns.reserve({
      guildId: interaction.guildId,
      channelId: interaction.channelId,
      command,
      invokerId: invoker.id,
      targetId: target.id,
    });
    if (!reservation.ok) {
      await interaction.reply(
        privateReply({
          content:
            `Agent J's ${reservation.scope.replaceAll("_", " ")} limiter is active. ` +
            `Try again in **${formatRemaining(reservation.remainingMs)}**.`,
        }),
      );
      return;
    }

    try {
      const targetMention = `<@${target.id}>`;
      let report;
      if (command === "scan") {
        const witness = await this.#witness(interaction, invoker, target);
        report = this.reportGenerator.generateScan({
          targetMention,
          witnessText: witness.text,
        });
      } else if (command === "memory") {
        const witness = await this.#witness(interaction, invoker, target);
        report = this.reportGenerator.generateMemory({
          targetMention,
          witnessText: witness.text,
        });
      } else {
        report = this.reportGenerator.generateThreat({ targetMention });
      }

      await interaction.reply({
        embeds: [reportEmbed(report)],
        allowedMentions: MENTIONS_SUPPRESSED,
      });
      this.cooldowns.commit(reservation.token);
      this.logger.info("report_delivered", {
        guildId: interaction.guildId,
        channelId: interaction.channelId,
        invokerId: invoker.id,
        targetId: target.id,
        command,
      });
    } catch (error) {
      this.cooldowns.release(reservation.token);
      throw error;
    }
  }

  async #showPrivacy(interaction) {
    const privacy = this.#privacy(interaction.guildId, interaction.user.id);
    await interaction.reply(privateReply(privacyPayload(privacy)));
  }

  async #handlePrivacyButton(interaction) {
    const [, field, action] = interaction.customId.split(":");
    const current = this.#privacy(interaction.guildId, interaction.user.id);
    let changes = {};
    if (field === "target" && action === "toggle") {
      changes = { targetOptOut: !current.targetOptOut };
    } else if (field === "witness" && action === "toggle") {
      changes = { witnessOptOut: !current.witnessOptOut };
    } else if (field === "ai" && action === "toggle") {
      changes = { aiContextOptOut: !current.aiContextOptOut };
    } else if (field === "all" && action === "optin") {
      changes = {
        targetOptOut: false,
        witnessOptOut: false,
        aiContextOptOut: false,
      };
    } else {
      await interaction.reply(
        privateReply({ content: "That privacy control is invalid." }),
      );
      return;
    }
    const next = this.userStore.setPrivacy(
      interaction.guildId,
      interaction.user.id,
      changes,
    );
    await interaction.update(privacyPayload(next));
  }

  async #handleArenaSlash(interaction) {
    const subcommand = interaction.options.getSubcommand();
    if (subcommand === "rules") {
      await interaction.reply(privateReply(arenaRulesPayload()));
      return;
    }
    if (!memberHasAccess(interaction.member, this.config.accessRoleIds)) {
      await interaction.reply(
        privateReply({
          content: "You do not have M.I.B. field clearance for the Arena.",
        }),
      );
      return;
    }

    if (subcommand === "shop") {
      const category =
        interaction.options.getString("category") ?? "gadget";
      const user = this.economyStore.getUser(
        interaction.guildId,
        interaction.user.id,
      );
      await interaction.reply(
        privateReply(shopPayload(category, user.credits)),
      );
      return;
    }
    if (subcommand === "inventory") {
      const user = this.economyStore.getUser(
        interaction.guildId,
        interaction.user.id,
      );
      await interaction.reply(
        privateReply(
          inventoryPayload(
            user,
            this.economyStore.getInventory(
              interaction.guildId,
              interaction.user.id,
            ),
            this.economyStore.getOwnedItems(
              interaction.guildId,
              interaction.user.id,
            ),
          ),
        ),
      );
      return;
    }
    if (subcommand === "profile") {
      const target =
        interaction.options.getUser("member") ?? interaction.user;
      const user = this.economyStore.getUser(
        interaction.guildId,
        target.id,
      );
      await interaction.reply(
        profilePayload(
          user,
          target.id,
          this.economyStore.getCosmetics(
            interaction.guildId,
            target.id,
          ),
        ),
      );
      return;
    }
    if (subcommand === "cosmetics") {
      const owned = this.economyStore.getOwnedItems(
        interaction.guildId,
        interaction.user.id,
      );
      const cosmetics = this.economyStore.getCosmetics(
        interaction.guildId,
        interaction.user.id,
      );
      await interaction.reply(
        privateReply(cosmeticsPayload(owned, cosmetics)),
      );
      return;
    }
    if (subcommand === "blacksite") {
      await this.#handleBlacksiteChallenge(interaction);
    }
  }

  async #handleShopButton(interaction) {
    if (!memberHasAccess(interaction.member, this.config.accessRoleIds)) {
      await interaction.reply(
        privateReply({ content: "Your requisition clearance was denied." }),
      );
      return;
    }
    const [, action, itemId] = interaction.customId.split(":");
    if (action !== "buy") {
      await interaction.reply(
        privateReply({ content: "That requisition control is invalid." }),
      );
      return;
    }
    try {
      const result = this.economyStore.purchase({
        guildId: interaction.guildId,
        userId: interaction.user.id,
        itemId,
        idempotencyKey: `shop:${interaction.id}`,
      });
      await interaction.update(shopPayload(result.item.kind, result.balance));
      await interaction.followUp(
        privateReply({
          content:
            `Requisition approved: **${result.item.name}**. ` +
            `Remaining balance: **${result.balance} BC**.`,
        }),
      );
    } catch (error) {
      await interaction.reply(
        privateReply({ content: errorMessage(error) }),
      );
    }
  }

  async #handleCosmeticButton(interaction) {
    if (!memberHasAccess(interaction.member, this.config.accessRoleIds)) {
      await interaction.reply(
        privateReply({ content: "Your presentation clearance was denied." }),
      );
      return;
    }
    const [, action, itemId] = interaction.customId.split(":");
    if (action !== "equip") {
      await interaction.reply(
        privateReply({ content: "That presentation control is invalid." }),
      );
      return;
    }
    try {
      const cosmetics = this.economyStore.equipCosmetic(
        interaction.guildId,
        interaction.user.id,
        itemId,
      );
      const owned = this.economyStore.getOwnedItems(
        interaction.guildId,
        interaction.user.id,
      );
      await interaction.update(cosmeticsPayload(owned, cosmetics));
    } catch (error) {
      await interaction.reply(
        privateReply({ content: errorMessage(error) }),
      );
    }
  }

  async #handleChallenge(interaction) {
    if (!this.config.arenaChannelId) {
      await interaction.reply(
        privateReply({
          content:
            "The Blacksite Arena channel has not been configured yet.",
        }),
      );
      return;
    }
    const { invoker, target } = await this.#membersForReport(interaction);
    const authorization = authorizeArenaChallenge({
      invoker,
      target,
      botUserId: this.client.user.id,
      accessRoleIds: this.config.accessRoleIds,
      protectedRoleIds: this.config.protectedRoleIds,
      invokerPrivacy: this.#privacy(invoker.guild.id, invoker.id),
      targetPrivacy: this.#privacy(target.guild.id, target.id),
      allowOptedOutInvokers: this.config.allowOptedOutInvokers,
    });
    if (!authorization.ok) {
      await interaction.reply(
        privateReply({ content: authorization.message }),
      );
      return;
    }

    await this.#sendChallenge(interaction, invoker, target);
  }

  async #handleBlacksiteChallenge(interaction) {
    if (!this.config.arenaChannelId) {
      await interaction.reply(
        privateReply({
          content:
            "The Blacksite Arena channel has not been configured yet.",
        }),
      );
      return;
    }
    const invoker =
      interaction.member?.roles?.cache
        ? interaction.member
        : await interaction.guild.members.fetch(interaction.user.id);
    const targetUser = interaction.options.getUser("opponent", true);
    const target =
      interaction.guild.members.cache.get(targetUser.id) ??
      (await interaction.guild.members.fetch(targetUser.id));
    const authorization = authorizeArenaChallenge({
      invoker,
      target,
      botUserId: this.client.user.id,
      accessRoleIds: this.config.accessRoleIds,
      protectedRoleIds: this.config.protectedRoleIds,
      invokerPrivacy: this.#privacy(invoker.guild.id, invoker.id),
      targetPrivacy: this.#privacy(target.guild.id, target.id),
      allowOptedOutInvokers: this.config.allowOptedOutInvokers,
    });
    if (!authorization.ok) {
      await interaction.reply(
        privateReply({ content: authorization.message }),
      );
      return;
    }
    const artifactId = interaction.options.getString("artifact", true);
    await this.#sendChallenge(interaction, invoker, target, {
      mode: "blacksite",
      artifactId,
    });
  }

  async #sendChallenge(
    interaction,
    invoker,
    target,
    { mode = "standard", artifactId = null } = {},
  ) {
    const channel =
      interaction.guild.channels.cache.get(this.config.arenaChannelId) ??
      (await interaction.guild.channels.fetch(this.config.arenaChannelId));
    if (!channel?.isTextBased() || !("send" in channel)) {
      await interaction.reply(
        privateReply({
          content: "The configured Arena channel cannot receive messages.",
        }),
      );
      return;
    }

    let match;
    try {
      match = this.arenaStore.createChallenge({
        guildId: interaction.guildId,
        channelId: channel.id,
        challengerId: invoker.id,
        opponentId: target.id,
        mode,
        artifactId,
      });
      const message = await channel.send(arenaMessagePayload(match));
      match = this.arenaStore.setMessageId(match.id, message.id);
      await interaction.reply(
        privateReply({
          content:
            `Challenge filed in <#${channel.id}>: ` +
            `https://discord.com/channels/${interaction.guildId}/${channel.id}/${message.id}`,
        }),
      );
      this.logger.info("arena_challenge_created", {
        guildId: interaction.guildId,
        channelId: channel.id,
        matchId: match.id,
        challengerId: invoker.id,
        opponentId: target.id,
        mode,
        artifactId,
      });
    } catch (error) {
      if (match?.id) {
        this.arenaStore.technicalCancel(match.id);
      }
      if (error?.code) {
        await interaction.reply(
          privateReply({ content: errorMessage(error) }),
        );
        return;
      }
      throw error;
    }
  }

  async #validateArenaParticipants(interaction, match) {
    const challenger =
      interaction.guild.members.cache.get(match.challenger_id) ??
      (await interaction.guild.members.fetch(match.challenger_id));
    const opponent =
      interaction.guild.members.cache.get(match.opponent_id) ??
      (await interaction.guild.members.fetch(match.opponent_id));
    return authorizeArenaChallenge({
      invoker: challenger,
      target: opponent,
      botUserId: this.client.user.id,
      accessRoleIds: this.config.accessRoleIds,
      protectedRoleIds: this.config.protectedRoleIds,
      invokerPrivacy: this.#privacy(interaction.guildId, challenger.id),
      targetPrivacy: this.#privacy(interaction.guildId, opponent.id),
      allowOptedOutInvokers: this.config.allowOptedOutInvokers,
    });
  }

  async #handleArenaButton(interaction) {
    const parts = interaction.customId.split(":");
    const [, action, matchId] = parts;
    const expectedRound =
      action === "open" || action === "tactic"
        ? Number(parts[3])
        : null;
    const value = action === "tactic" ? parts[4] : parts[3];
    const match = this.arenaStore.getMatch(matchId);
    if (!match) {
      await interaction.reply(
        privateReply({ content: "That Arena file no longer exists." }),
      );
      return;
    }
    if (
      !arenaControlBelongsToMatch({
        action,
        match,
        guildId: interaction.guildId,
        channelId: interaction.channelId,
        messageId: interaction.message?.id,
      })
    ) {
      this.logger.info("arena_control_rejected", {
        guildId: interaction.guildId,
        channelId: interaction.channelId,
        userId: interaction.user.id,
        matchId,
        action,
        interactionMessageId: interaction.message?.id ?? null,
        arenaMessageId: match.message_id,
      });
      await interaction.reply(
        privateReply({
          content:
            "That Arena control does not belong to this Bureau case file.",
        }),
      );
      return;
    }

    const authorization = await this.#validateArenaParticipants(
      interaction,
      match,
    );
    if (!authorization.ok) {
      await interaction.reply(
        privateReply({ content: authorization.message }),
      );
      return;
    }

    try {
      if (action === "shop") {
        if (
          interaction.user.id !== match.challenger_id &&
          interaction.user.id !== match.opponent_id
        ) {
          await interaction.reply(
            privateReply({
              content:
                "Only the two assigned fighters may requisition equipment from this challenge card.",
            }),
          );
          return;
        }
        if (match.status !== "pending") {
          await interaction.reply(
            privateReply({
              content:
                "Pre-fight requisitions closed when this challenge left the acceptance phase.",
            }),
          );
          return;
        }
        const user = this.economyStore.getUser(
          interaction.guildId,
          interaction.user.id,
        );
        await interaction.reply(
          privateReply(shopPayload("gadget", user.credits)),
        );
        return;
      }
      if (action === "accept") {
        const accepted = this.arenaStore.accept(
          matchId,
          interaction.user.id,
        );
        try {
          await interaction.update(arenaMessagePayload(accepted, [], 0));
        } catch (error) {
          this.arenaStore.technicalCancel(matchId);
          throw error;
        }
        if (accepted.status === "round_select") {
          try {
            await this.postTurnPrompt(accepted);
            await this.refreshArenaMessage(matchId);
          } catch (error) {
            this.logger.error("arena_turn_prompt_failed", error, {
              matchId: accepted.id,
              roundNumber: accepted.current_round,
            });
            this.cancelIfControlMissing(accepted.id);
            await this.refreshArenaMessage(accepted.id).catch(() => {});
          }
        }
        return;
      }
      if (action === "decline") {
        const declined = this.arenaStore.decline(
          matchId,
          interaction.user.id,
        );
        await interaction.update(arenaMessagePayload(declined));
        this.queueArenaMessageCleanup(declined, declined.message_id);
        return;
      }
      if (action === "equipment") {
        if (
          interaction.user.id !== match.challenger_id &&
          interaction.user.id !== match.opponent_id
        ) {
          await interaction.reply(
            privateReply({
              content: "You are not assigned to this Arena file.",
            }),
          );
          return;
        }
        if (match.status !== "equipment_select") {
          await interaction.reply(
            privateReply({
              content: "This match is not accepting equipment selections.",
            }),
          );
          return;
        }
        const side =
          interaction.user.id === match.challenger_id
            ? "challenger"
            : "opponent";
        if (match[`${side}_equipment_locked`]) {
          await interaction.reply(
            privateReply({
              content:
                "Your equipment file is already locked. Agent J does not accept suspiciously timed exchanges.",
            }),
          );
          return;
        }
        await interaction.reply(
          privateReply(
            equipmentSelectionPayload(
              match,
              this.arenaStore.getAvailableGadgets(
                interaction.guildId,
                interaction.user.id,
              ),
            ),
          ),
        );
        return;
      }
      if (action === "gadget") {
        const gadgetId = value === "none" ? null : value;
        const result = this.arenaStore.selectEquipment(
          matchId,
          interaction.user.id,
          gadgetId,
        );
        const gadget = getItem(gadgetId);
        await interaction.update({
          content: gadget
            ? `Equipment locked: **${gadget.name}**. It remains classified until the fight begins.`
            : "Equipment locked: **No Gadget**. Bold, economical, or both.",
          components: [],
          allowedMentions: MENTIONS_SUPPRESSED,
        });
        if (result.state === "ready") {
          try {
            await this.postTurnPrompt(result.match);
          } catch (error) {
            this.logger.error("arena_turn_prompt_failed", error, {
              matchId: result.match.id,
              roundNumber: result.match.current_round,
            });
            this.cancelIfControlMissing(result.match.id);
          }
        }
        await this.refreshArenaMessage(matchId);
        return;
      }
      if (action === "open") {
        if (
          interaction.user.id !== match.challenger_id &&
          interaction.user.id !== match.opponent_id
        ) {
          await interaction.reply(
            privateReply({
              content: "You are not assigned to this Arena file.",
            }),
          );
          return;
        }
        if (match.status !== "round_select") {
          await interaction.reply(
            privateReply({
              content: "This match is not accepting tactics.",
            }),
          );
          return;
        }
        if (
          !Number.isInteger(expectedRound) ||
          expectedRound !== match.current_round ||
          expectedRound !== match.control_round
        ) {
          await interaction.reply(
            privateReply({
              content:
                "That move button belongs to an older Arena round. Use the newest Agent J control card.",
            }),
          );
          return;
        }
        const existing = this.arenaStore.getTacticChoice(
          match.id,
          match.current_round,
          interaction.user.id,
        );
        if (existing) {
          await interaction.reply(
            privateReply({
              content:
                `Your Round ${match.current_round} tactic is already locked. ` +
                "Agent J does not accept edits after seeing the future.",
            }),
          );
          return;
        }
        await interaction.reply(
          privateReply(tacticSelectionPayload(match)),
        );
        return;
      }
      if (action === "tactic") {
        const result = this.arenaStore.submitTactic(
          matchId,
          interaction.user.id,
          value,
          expectedRound,
        );
        const chosen =
          displayTactic(result.tactic ?? value);
        try {
          await interaction.update({
            content: `Tactic locked: **${chosen}**. Your opponent cannot see it yet.`,
            components: [],
            allowedMentions: MENTIONS_SUPPRESSED,
          });
          if (
            result.state === "round_resolved" ||
            result.state === "complete"
          ) {
            try {
              await this.postRoundResult(result.match, result.round);
              await this.retireArenaControlMessage(
                result.match,
                result.previousControlMessageId,
              );
            } catch (error) {
              this.logger.error("arena_round_post_failed", error, {
                matchId: result.match.id,
                roundNumber: result.round.round_number,
              });
              if (result.state === "round_resolved") {
                this.cancelIfControlMissing(result.match.id);
              }
              await this.retireArenaControlMessage(
                result.match,
                result.previousControlMessageId,
              ).catch(() => {});
            }
          }
          await this.refreshArenaMessage(matchId);
          await this.refreshArenaControlMessage(matchId);
          if (result.state === "complete") {
            await this.archiveCompletedMatch(result.match).catch((error) => {
              this.logger.error("arena_archive_failed", error, {
                matchId: result.match.id,
              });
            });
          }
        } catch (error) {
          const current = this.arenaStore.getMatch(matchId);
          if (
            current &&
            ["pending", "equipment_select", "round_select"].includes(
              current.status,
            )
          ) {
            this.arenaStore.technicalCancel(matchId);
          }
          throw error;
        }
        return;
      }

      await interaction.reply(
        privateReply({ content: "That Arena control is invalid." }),
      );
    } catch (error) {
      if (error?.code) {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(
            privateReply({ content: errorMessage(error) }),
          );
        } else {
          await interaction.reply(
            privateReply({ content: errorMessage(error) }),
          );
        }
        return;
      }
      throw error;
    }
  }

  async refreshArenaMessage(matchId) {
    const match = this.arenaStore.getMatch(matchId);
    if (!match?.message_id) {
      return false;
    }
    const channel = await this.client.channels.fetch(match.channel_id);
    if (!channel?.isTextBased() || !("messages" in channel)) {
      return false;
    }
    const message = await channel.messages.fetch(match.message_id);
    const rounds = this.arenaStore.getRounds(match.id);
    const lockedCount =
      match.status === "round_select"
        ? this.arenaStore.getLockedTacticCount(
            match.id,
            match.current_round,
          )
        : 0;
    await message.edit(arenaMessagePayload(match, rounds, lockedCount));
    if (TERMINAL_ARENA_STATUSES.has(match.status)) {
      this.queueArenaMessageCleanup(match, message.id);
    }
    return true;
  }

  queueArenaMessageCleanup(match, messageId) {
    if (!messageId || !this.config.arenaCleanupDelayMs) {
      return false;
    }
    this.arenaStore.queueMessageCleanup({
      matchId: match.id,
      guildId: match.guild_id,
      channelId: match.channel_id,
      messageId,
      deleteAfterMs: Date.now() + this.config.arenaCleanupDelayMs,
    });
    return true;
  }

  cancelIfControlMissing(matchId) {
    const current = this.arenaStore.getMatch(matchId);
    if (
      current?.status === "round_select" &&
      !current.control_message_id
    ) {
      return this.arenaStore.technicalCancel(matchId);
    }
    return current;
  }

  async retireArenaControlMessage(match, messageId) {
    if (!messageId || messageId === match.message_id) {
      return false;
    }
    const channel = await this.client.channels.fetch(match.channel_id);
    if (!channel?.isTextBased() || !("messages" in channel)) {
      return false;
    }
    const message = await channel.messages.fetch(messageId);
    await message.edit({ components: [] });
    this.queueArenaMessageCleanup(match, message.id);
    return true;
  }

  async postRoundResult(match, round) {
    const channel = await this.client.channels.fetch(match.channel_id);
    if (!channel?.isTextBased() || !("send" in channel)) {
      return false;
    }
    const message = await channel.send(
      arenaRoundResultPayload(match, round),
    );
    if (match.status === "round_select") {
      try {
        const assigned = this.arenaStore.setControlMessageId(
          match.id,
          message.id,
          match.current_round,
        );
        await message.edit(arenaRoundResultPayload(assigned, round));
        return assigned;
      } catch (error) {
        await message.edit({ components: [] }).catch(() => {});
        throw error;
      }
    }
    this.queueArenaMessageCleanup(match, message.id);
    return match;
  }

  async postTurnPrompt(match) {
    const channel = await this.client.channels.fetch(match.channel_id);
    if (!channel?.isTextBased() || !("send" in channel)) {
      return false;
    }
    const message = await channel.send(arenaTurnPromptPayload(match));
    try {
      const assigned = this.arenaStore.setControlMessageId(
        match.id,
        message.id,
        match.current_round,
      );
      await message.edit(arenaTurnPromptPayload(assigned));
      return assigned;
    } catch (error) {
      await message.edit({ components: [] }).catch(() => {});
      throw error;
    }
  }

  async refreshArenaControlMessage(matchId) {
    const match = this.arenaStore.getMatch(matchId);
    if (
      !match?.control_message_id ||
      match.control_message_id === match.message_id
    ) {
      return false;
    }
    const channel = await this.client.channels.fetch(match.channel_id);
    if (!channel?.isTextBased() || !("messages" in channel)) {
      return false;
    }
    const message = await channel.messages.fetch(match.control_message_id);
    if (match.status !== "round_select") {
      await message.edit({ components: [] });
      this.queueArenaMessageCleanup(match, message.id);
      return true;
    }
    const rounds = this.arenaStore.getRounds(match.id);
    const lockedCount = this.arenaStore.getLockedTacticCount(
      match.id,
      match.current_round,
    );
    await message.edit(
      rounds.length
        ? arenaRoundResultPayload(match, rounds.at(-1), lockedCount)
        : arenaTurnPromptPayload(match, lockedCount),
    );
    return true;
  }

  async archiveCompletedMatch(match) {
    if (!this.config.arenaResultsChannelId) {
      return false;
    }
    const current = this.arenaStore.getMatch(match.id);
    if (current?.status !== "complete" || current.archive_message_id) {
      return false;
    }
    const channel = await this.client.channels.fetch(
      this.config.arenaResultsChannelId,
    );
    if (!channel?.isTextBased() || !("send" in channel)) {
      throw new Error("Arena results channel is unavailable.");
    }
    const rounds = this.arenaStore.getRounds(current.id);
    const message = await channel.send(arenaMessagePayload(current, rounds));
    const assigned = this.arenaStore.setArchiveMessageId(
      current.id,
      message.id,
    );
    if (assigned.archive_message_id !== message.id) {
      await message.delete().catch(() => {});
      return false;
    }
    this.queueArenaMessageCleanup(current, current.message_id);
    this.logger.info("arena_result_archived", {
      guildId: current.guild_id,
      sourceChannelId: current.channel_id,
      resultsChannelId: channel.id,
      matchId: current.id,
      messageId: message.id,
    });
    return true;
  }

  async archivePendingCompletedMatches(limit = 25) {
    let archived = 0;
    for (const match of this.arenaStore.getUnarchivedCompletedMatches(limit)) {
      try {
        if (await this.archiveCompletedMatch(match)) {
          archived += 1;
        }
      } catch (error) {
        this.logger.error("arena_archive_failed", error, {
          matchId: match.id,
        });
        break;
      }
    }
    return archived;
  }

  async sweepArenaMessageCleanup(limit = 50) {
    let deleted = 0;
    for (const pending of this.arenaStore.getDueMessageCleanup(
      Date.now(),
      limit,
    )) {
      try {
        const channel = await this.client.channels.fetch(pending.channel_id);
        if (!channel?.isTextBased() || !("messages" in channel)) {
          throw Object.assign(new Error("Arena source channel unavailable."), {
            code: 10003,
          });
        }
        const message = await channel.messages.fetch(pending.message_id);
        await message.delete();
        this.arenaStore.completeMessageCleanup(pending.message_id);
        deleted += 1;
      } catch (error) {
        if (
          error?.code === 10003 ||
          error?.code === 10008 ||
          error?.status === 404
        ) {
          this.arenaStore.completeMessageCleanup(pending.message_id);
          continue;
        }
        this.arenaStore.retryMessageCleanup(pending.message_id);
        this.logger.error("arena_message_cleanup_failed", error, {
          matchId: pending.match_id,
          channelId: pending.channel_id,
          messageId: pending.message_id,
          attempts: pending.attempts + 1,
        });
      }
    }
    return deleted;
  }

  async handleSweeperTransition(transition) {
    try {
      await this.refreshArenaMessage(transition.id);
      await this.refreshArenaControlMessage(transition.id);
    } catch (error) {
      this.logger.error("arena_message_refresh_failed", error, {
        matchId: transition.id,
        channelId: transition.channel_id,
      });
    }
  }
}
