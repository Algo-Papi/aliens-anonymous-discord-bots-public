import {
  ApplicationCommandType,
  ContextMenuCommandBuilder,
  SlashCommandBuilder,
} from "discord.js";

import { ARTIFACTS } from "../economy/catalog.js";

export const COMMANDS = Object.freeze({
  scan: "Scan Subject",
  memory: "Memory Audit",
  threat: "Assess Threat",
  challenge: "Challenge in Blacksite Arena",
  research: "M.I.B. Field Research",
  agentJ: "agent-j",
  arena: "arena",
});

export function buildCommands() {
  const contextCommands = [
    COMMANDS.scan,
    COMMANDS.memory,
    COMMANDS.threat,
    COMMANDS.challenge,
  ].flatMap((name) =>
    [ApplicationCommandType.User, ApplicationCommandType.Message].map((type) =>
      new ContextMenuCommandBuilder().setName(name).setType(type).toJSON(),
    ),
  );

  contextCommands.push(
    new ContextMenuCommandBuilder()
      .setName(COMMANDS.research)
      .setType(ApplicationCommandType.Message)
      .toJSON(),
  );

  return [
    ...contextCommands,
    new SlashCommandBuilder()
      .setName(COMMANDS.agentJ)
      .setDescription("Agent J participation and AI-context privacy controls.")
      .addSubcommand((subcommand) =>
        subcommand
          .setName("privacy")
          .setDescription("Manage targeting, witness, and AI-context preferences."),
      )
      .toJSON(),
    new SlashCommandBuilder()
      .setName(COMMANDS.arena)
      .setDescription("The Blacksite Arena.")
      .addSubcommand((subcommand) =>
        subcommand
          .setName("rules")
          .setDescription("View the Blacksite Arena rules."),
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName("shop")
          .setDescription("Browse the Arena requisitions catalog.")
          .addStringOption((option) =>
            option
              .setName("category")
              .setDescription("Which requisitions shelf to inspect.")
              .setRequired(false)
              .addChoices(
                { name: "Gadgets", value: "gadget" },
                { name: "Case-file themes", value: "theme" },
                { name: "Victory stamps", value: "stamp" },
                { name: "Broadcast packs", value: "broadcast" },
                { name: "Black Vault Artifacts", value: "artifact" },
              ),
          ),
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName("inventory")
          .setDescription("View your gadgets and permanent unlocks."),
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName("profile")
          .setDescription("View an Arena case file.")
          .addUserOption((option) =>
            option
              .setName("member")
              .setDescription("Member whose Arena file to view.")
              .setRequired(false),
          ),
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName("cosmetics")
          .setDescription("Equip an owned case theme, stamp, or broadcast pack."),
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName("blacksite")
          .setDescription("Issue a disclosed Full Blacksite Artifact challenge.")
          .addUserOption((option) =>
            option
              .setName("opponent")
              .setDescription("The member being challenged.")
              .setRequired(true),
          )
          .addStringOption((option) =>
            option
              .setName("artifact")
              .setDescription("Your account-bound Black Vault Artifact.")
              .setRequired(true)
              .addChoices(
                ...ARTIFACTS.map((artifact) => ({
                  name: artifact.name,
                  value: artifact.id,
                })),
              ),
          ),
      )
      .toJSON(),
  ];
}
