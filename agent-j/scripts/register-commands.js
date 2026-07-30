import { REST, Routes } from "discord.js";

import { buildCommands } from "../src/commands/definitions.js";
import { loadRegistrationConfig } from "../src/config.js";

async function register() {
  const { token, clientId, guildId } = loadRegistrationConfig();
  const rest = new REST({ version: "10" }).setToken(token);
  const commands = buildCommands();
  const registered = await rest.put(
    Routes.applicationGuildCommands(clientId, guildId),
    { body: commands },
  );
  console.log(
    `Registered ${registered.length} Agent J commands in guild ${guildId}.`,
  );
}

register().catch((error) => {
  console.error("Agent J command registration failed:", error.message);
  process.exitCode = 1;
});
