import assert from "node:assert/strict";
import test from "node:test";

import {
  ApplicationCommandType,
  PermissionFlagsBits,
} from "discord.js";

import {
  buildCommands,
  EARTH_INTEL_HEALTH_COMMAND_NAME,
  ISSUE_CITATION_COMMAND_NAME,
  VIEW_CITATION_RECORD_COMMAND_NAME,
} from "../src/register-commands.js";

test("registers issue and record commands on the expected context surfaces", () => {
  const commands = buildCommands();
  const issue = commands.find(
    (command) =>
      command.name === ISSUE_CITATION_COMMAND_NAME &&
      command.type === ApplicationCommandType.Message,
  );
  const messageRecord = commands.find(
    (command) =>
      command.name === VIEW_CITATION_RECORD_COMMAND_NAME &&
      command.type === ApplicationCommandType.Message,
  );
  const userRecord = commands.find(
    (command) =>
      command.name === VIEW_CITATION_RECORD_COMMAND_NAME &&
      command.type === ApplicationCommandType.User,
  );
  const earthIntelHealth = commands.find(
    (command) => command.name === EARTH_INTEL_HEALTH_COMMAND_NAME,
  );

  assert.equal(commands.length, 4);
  assert.ok(issue);
  assert.ok(messageRecord);
  assert.ok(userRecord);
  assert.ok(earthIntelHealth);
  assert.equal(issue.default_member_permissions, null);
  assert.equal(messageRecord.default_member_permissions, undefined);
  assert.equal(userRecord.default_member_permissions, undefined);
  assert.equal(
    earthIntelHealth.default_member_permissions,
    PermissionFlagsBits.Administrator.toString(),
  );
});
