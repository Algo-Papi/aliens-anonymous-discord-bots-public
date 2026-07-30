import { existsSync } from "node:fs";

import { ArenaStore } from "../src/arena/arena-store.js";
import {
  getSchemaVersion,
  openDatabase,
} from "../src/db/database.js";
import { loadDiagnosticConfig } from "../src/config.js";
import { buildCommands } from "../src/commands/definitions.js";

const config = loadDiagnosticConfig();
const database = openDatabase(config.databasePath);
try {
  const arena = new ArenaStore(database);
  console.log(
    JSON.stringify(
      {
        clientIdConfigured: Boolean(config.clientId),
        guildId: config.guildId,
        arenaChannelConfigured: Boolean(config.arenaChannelId),
        arenaResultsChannelConfigured: Boolean(
          config.arenaResultsChannelId,
        ),
        arenaCleanupDelaySeconds:
          config.arenaCleanupDelayMs / 1_000,
        accessRoleCount: config.accessRoleIds.size,
        protectedRoleCount: config.protectedRoleIds.size,
        research: {
          enabled: config.research.enabled,
          openAIKeyConfigured: config.openAIKeyConfigured,
      standardModel: config.research.standardModel,
      deepModel: config.research.deepModel,
          roleCount: config.research.roleIds.size,
          channelCount: config.research.channelIds.size,
          focusedMessageLimit: config.research.focusedMessageLimit,
          standardMessageLimit: config.research.standardMessageLimit,
          timeoutMs: config.research.timeoutMs,
        },
        databasePath: config.databasePath,
        databaseExists: existsSync(config.databasePath),
        schemaVersion: getSchemaVersion(database),
        commandNames: buildCommands().map((command) => command.name),
        activeMatches: arena.diagnostics(),
      },
      null,
      2,
    ),
  );
} finally {
  database.close();
}
