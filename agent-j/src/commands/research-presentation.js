import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

import { MENTIONS_SUPPRESSED } from "./presentation.js";

const MODE_LABELS = Object.freeze({
  fact_check: "Fact-check selected claim",
  ground: "Ground this discussion",
  research: "Research a question",
});

const SCOPE_LABELS = Object.freeze({
  focused: "Focused",
  standard: "Standard",
});

const TIER_LABELS = Object.freeze({
  standard: "Standard Research — Luna",
  deep: "Deep Research — Terra",
});

function splitMarkdown(markdown, maximumTotal = 5_500) {
  let remaining = markdown.slice(0, maximumTotal);
  const chunks = [];
  while (remaining) {
    if (remaining.length <= 3_900) {
      chunks.push(remaining);
      break;
    }
    let splitAt = remaining.lastIndexOf("\n\n", 3_900);
    if (splitAt < 2_800) {
      splitAt = remaining.lastIndexOf("\n", 3_900);
    }
    if (splitAt < 2_800) {
      splitAt = 3_900;
    }
    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt).trimStart();
  }
  return chunks.slice(0, 2);
}

export function researchSetupPayload(session) {
  const modeOptions = Object.entries(MODE_LABELS).map(([value, label]) =>
    new StringSelectMenuOptionBuilder()
      .setLabel(label)
      .setValue(value)
      .setDefault(value === session.mode),
  );
  const scopeOptions = [
    new StringSelectMenuOptionBuilder()
      .setLabel("Focused — up to 10 closely related messages")
      .setValue("focused")
      .setDefault(session.scope === "focused"),
    new StringSelectMenuOptionBuilder()
      .setLabel("Standard — up to 25 nearby messages")
      .setValue("standard")
      .setDefault(session.scope === "standard"),
  ];
  const tierOptions = [
    new StringSelectMenuOptionBuilder()
      .setLabel("Standard Research — Luna")
      .setDescription("Fast, efficient live-web research for routine checks")
      .setValue("standard")
      .setDefault(session.tier === "standard"),
    new StringSelectMenuOptionBuilder()
      .setLabel("Deep Research — Terra")
      .setDescription("Higher-cost, more thorough work for difficult topics")
      .setValue("deep")
      .setDefault(session.tier === "deep"),
  ];
  return {
    content:
      "**M.I.B. FIELD RESEARCH — DESK SETUP**\n" +
      `Mode: **${MODE_LABELS[session.mode]}**\n` +
      `Context: **${SCOPE_LABELS[session.scope]}**\n` +
      `Research level: **${TIER_LABELS[session.tier]}**\n\n` +
      "Live web search is mandatory. Selected public Discord text is pseudonymized and screened for common secrets before it is sent to OpenAI. Images and attachments are not included. Members may opt out with `/agent-j privacy`.",
    components: [
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`research:mode:${session.id}`)
          .setPlaceholder("Choose a research mode")
          .addOptions(modeOptions),
      ),
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`research:scope:${session.id}`)
          .setPlaceholder("Choose context scope")
          .addOptions(scopeOptions),
      ),
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`research:tier:${session.id}`)
          .setPlaceholder("Choose research depth")
          .addOptions(tierOptions),
      ),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`research:continue:${session.id}`)
          .setLabel("Continue")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`research:discard:${session.id}`)
          .setLabel("Discard")
          .setStyle(ButtonStyle.Secondary),
      ),
    ],
    allowedMentions: MENTIONS_SUPPRESSED,
  };
}

export function researchQuestionModal(session) {
  const required = session.mode === "research";
  return new ModalBuilder()
    .setCustomId(`research:submit:${session.id}`)
    .setTitle("M.I.B. Field Research")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("question")
          .setLabel(
            required
              ? "What should Agent J research?"
              : "Optional focus or question",
          )
          .setPlaceholder(
            required
              ? "Ask a specific research question."
              : "Leave blank to analyze the selected discussion.",
          )
          .setStyle(TextInputStyle.Paragraph)
          .setMaxLength(1_000)
          .setRequired(required)
          .setValue(session.question || ""),
      ),
    );
}

function resultEmbeds(session, preview) {
  const chunks = splitMarkdown(session.result.markdown);
  return chunks.map((chunk, index) => {
    const embed = new EmbedBuilder()
      .setColor(0x00a8e8)
      .setDescription(chunk);
    if (index === 0) {
      embed.setTitle(
        preview
          ? "M.I.B. FIELD RESEARCH — PRIVATE PREVIEW"
          : "M.I.B. FIELD RESEARCH BRIEF",
      );
    }
    if (index === chunks.length - 1) {
      const privacyOmissions = session.result.context.omittedForPrivacy;
      embed.setFooter({
        text:
          `${MODE_LABELS[session.mode]} • ${SCOPE_LABELS[session.scope]} context • ` +
          `${TIER_LABELS[session.tier]} • ` +
          `${session.result.context.messageCount} message(s)` +
          (privacyOmissions
            ? ` • ${privacyOmissions} privacy opt-out omission(s)`
            : "") +
          " • Live web research",
      });
    }
    return embed;
  });
}

export function researchPreviewPayload(session) {
  return {
    content:
      "Review the sourced brief below. Publishing reuses this exact result and does not make another paid API request.",
    embeds: resultEmbeds(session, true),
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`research:publish:${session.id}`)
          .setLabel("Publish Brief")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`research:rerun:${session.id}`)
          .setLabel("Run Again")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`research:discard:${session.id}`)
          .setLabel("Discard")
          .setStyle(ButtonStyle.Secondary),
      ),
    ],
    allowedMentions: MENTIONS_SUPPRESSED,
  };
}

export function researchPublicPayload(session) {
  return {
    embeds: resultEmbeds(session, false),
    allowedMentions: MENTIONS_SUPPRESSED,
  };
}
