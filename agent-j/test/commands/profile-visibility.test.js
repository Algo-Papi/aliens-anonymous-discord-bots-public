import assert from "node:assert/strict";
import test from "node:test";

import { InteractionController } from "../../src/commands/controller.js";
import { COMMANDS } from "../../src/commands/definitions.js";

test("Arena profile lookups are public and mention-safe", async () => {
  const replies = [];
  const controller = new InteractionController({
    client: { user: { id: "agent-j" } },
    config: {
      guildId: "guild",
      accessRoleIds: new Set(["field-clearance"]),
    },
    economyStore: {
      getUser: () => ({
        credits: 24,
        wins: 3,
        losses: 2,
        reputation: 9,
        current_streak: 1,
        best_streak: 2,
        artifact_wins: 0,
        artifact_losses: 0,
      }),
      getCosmetics: () => ({
        theme: null,
        stamp: null,
        broadcast: null,
      }),
    },
  });
  const interaction = {
    guildId: "guild",
    commandName: COMMANDS.arena,
    user: { id: "invoker" },
    member: { roles: ["field-clearance"] },
    options: {
      getSubcommand: () => "profile",
      getUser: () => ({ id: "target" }),
    },
    inGuild: () => true,
    isRepliable: () => true,
    isUserContextMenuCommand: () => false,
    isMessageContextMenuCommand: () => false,
    isChatInputCommand: () => true,
    isButton: () => false,
    isStringSelectMenu: () => false,
    isModalSubmit: () => false,
    reply: async (payload) => replies.push(payload),
  };

  await controller.handle(interaction);

  assert.equal(replies.length, 1);
  assert.equal(replies[0].flags, undefined);
  assert.deepEqual(replies[0].allowedMentions, {
    parse: [],
    users: [],
  });
  assert.match(replies[0].embeds[0].data.description, /<@target>/);
});
