import {
  ApplicationCommandType,
  ContextMenuCommandBuilder,
  PermissionFlagsBits,
  REST,
  Routes,
  SlashCommandBuilder,
} from "discord.js";
import { pathToFileURL } from "node:url";

import { loadRegistrationConfig } from "./config.js";

export const ISSUE_CITATION_COMMAND_NAME = "Issue Citation";
export const VIEW_CITATION_RECORD_COMMAND_NAME = "View Citation Record";
export const EARTH_INTEL_HEALTH_COMMAND_NAME = "earth-intel-health";

export function buildCommands() {
  return [
    new ContextMenuCommandBuilder()
      .setName(ISSUE_CITATION_COMMAND_NAME)
      .setType(ApplicationCommandType.Message)
      .setDefaultMemberPermissions(null)
      .toJSON(),
    new ContextMenuCommandBuilder()
      .setName(VIEW_CITATION_RECORD_COMMAND_NAME)
      .setType(ApplicationCommandType.Message)
      .toJSON(),
    new ContextMenuCommandBuilder()
      .setName(VIEW_CITATION_RECORD_COMMAND_NAME)
      .setType(ApplicationCommandType.User)
      .toJSON(),
    new SlashCommandBuilder()
      .setName(EARTH_INTEL_HEALTH_COMMAND_NAME)
      .setDescription(
        "Show the live Earth Intel source and transport health report.",
      )
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .toJSON(),
  ];
}

async function register() {
  const { token, clientId, guildId } = loadRegistrationConfig();
  const rest = new REST({ version: "10" }).setToken(token);
  const commands = buildCommands();
  const collectionRoute = Routes.applicationGuildCommands(clientId, guildId);
  const existing = await rest.get(collectionRoute);

  for (const command of commands) {
    const match = existing.find(
      (candidate) =>
        candidate.name === command.name && candidate.type === command.type,
    );

    if (match) {
      await rest.patch(
        Routes.applicationGuildCommand(clientId, guildId, match.id),
        { body: command },
      );
      console.log(
        `Updated "${command.name}" (type ${command.type}) in guild ${guildId}.`,
      );
      continue;
    }

    await rest.post(collectionRoute, { body: command });
    console.log(
      `Registered "${command.name}" (type ${command.type}) in guild ${guildId}.`,
    );
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  register().catch((error) => {
    console.error("Command registration failed:", error.message);
    process.exitCode = 1;
  });
}
