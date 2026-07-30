import assert from "node:assert/strict";
import test from "node:test";

import { buildCommands, COMMANDS } from "../../src/commands/definitions.js";
import {
  arenaMessagePayload,
  arenaRoundResultPayload,
  arenaTurnPromptPayload,
  privacyPayload,
  tacticSelectionPayload,
} from "../../src/commands/presentation.js";
import { ApplicationCommandType } from "discord.js";

test("Agent J registers the approved entertainment and research catalog", () => {
  const commands = buildCommands();
  assert.equal(commands.length, 11);
  assert.deepEqual(
    new Set(commands.map((command) => command.name)),
    new Set([
      COMMANDS.scan,
      COMMANDS.memory,
      COMMANDS.threat,
      COMMANDS.challenge,
      COMMANDS.research,
      COMMANDS.agentJ,
      COMMANDS.arena,
    ]),
  );
  for (const name of [
    COMMANDS.scan,
    COMMANDS.memory,
    COMMANDS.threat,
    COMMANDS.challenge,
  ]) {
    assert.deepEqual(
      new Set(
        commands
          .filter((command) => command.name === name)
          .map((command) => command.type),
      ),
      new Set([
        ApplicationCommandType.User,
        ApplicationCommandType.Message,
      ]),
    );
  }
  assert.deepEqual(
    commands
      .filter((command) => command.name === COMMANDS.research)
      .map((command) => command.type),
    [ApplicationCommandType.Message],
  );
  const arena = commands.find(
    (command) =>
      command.name === COMMANDS.arena &&
      command.type === ApplicationCommandType.ChatInput,
  );
  assert.deepEqual(
    new Set(arena.options.map((option) => option.name)),
    new Set([
      "rules",
      "shop",
      "inventory",
      "profile",
      "cosmetics",
      "blacksite",
    ]),
  );
});

test("public Arena payload suppresses mentions", () => {
  const payload = arenaMessagePayload({
    id: "match",
    challenger_id: "100",
    opponent_id: "200",
    challenger_round_wins: 0,
    opponent_round_wins: 0,
    status: "pending",
    expires_at: new Date(Date.now() + 60_000).toISOString(),
  });
  assert.deepEqual(payload.allowedMentions, { parse: [], users: [] });
  assert.equal(payload.components.length, 1);
  assert.deepEqual(
    payload.components[0].components.map(
      (component) => component.data.custom_id,
    ),
    [
      "arena:accept:match",
      "arena:decline:match",
      "arena:shop:match",
    ],
  );
});

test("privacy controls are ephemeral-ready and mention-safe", () => {
  const payload = privacyPayload({
    targetOptOut: false,
    witnessOptOut: true,
    aiContextOptOut: false,
  });
  assert.deepEqual(payload.allowedMentions, { parse: [], users: [] });
  assert.equal(payload.components.length, 2);
  assert.equal(
    payload.components[1].components[0].data.custom_id,
    "privacy:ai:toggle",
  );
});

test("fresh round cards carry the next active tactic control", () => {
  const match = {
    id: "match",
    message_id: "original",
    control_message_id: "latest",
    challenger_id: "100",
    opponent_id: "200",
    challenger_round_wins: 1,
    opponent_round_wins: 0,
    current_round: 2,
    status: "round_select",
    ranked: 1,
    match_mode: "standard",
    expires_at: new Date(Date.now() + 35_000).toISOString(),
  };
  const round = {
    round_number: 1,
    winner_id: "100",
    challenger_tactic: "blast",
    opponent_tactic: "dirty_trick",
    challenger_initial_roll: 50,
    opponent_initial_roll: 40,
    challenger_final_raw_roll: 50,
    opponent_final_raw_roll: 40,
    challenger_tactic_bonus: 15,
    opponent_tactic_bonus: 0,
    challenger_gadget_modifier: 0,
    opponent_gadget_modifier: 0,
    challenger_total: 65,
    opponent_total: 40,
    narration_id: "warning-shot-performance-review",
  };
  const result = arenaRoundResultPayload(match, round, 1);
  assert.equal(
    result.components[0].components[0].data.custom_id,
    "arena:open:match:2",
  );
  assert.match(result.embeds[0].data.fields.at(-1).name, /Round 2/);

  const prompt = arenaTurnPromptPayload(match);
  assert.equal(
    prompt.components[0].components[0].data.custom_id,
    "arena:open:match:2",
  );

  const original = arenaMessagePayload(match, [round], 0);
  assert.equal(original.components.length, 0);

  const privatePicker = tacticSelectionPayload(match);
  assert.deepEqual(
    privatePicker.components[0].components.map(
      (component) => component.data.custom_id,
    ),
    [
      "arena:tactic:match:2:blast",
      "arena:tactic:match:2:shield",
      "arena:tactic:match:2:dirty_trick",
    ],
  );
});
