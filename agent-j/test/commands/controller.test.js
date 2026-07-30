import assert from "node:assert/strict";
import test from "node:test";

import {
  arenaControlBelongsToMatch,
} from "../../src/commands/controller.js";

const match = Object.freeze({
  guild_id: "guild",
  channel_id: "arena",
  message_id: "public-arena-card",
});

test("private tactic and gadget controls accept ephemeral message IDs", () => {
  for (const action of ["tactic", "gadget"]) {
    assert.equal(
      arenaControlBelongsToMatch({
        action,
        match,
        guildId: "guild",
        channelId: "arena",
        messageId: `private-${action}-picker`,
      }),
      true,
    );
  }
});

test("public Arena controls remain bound to the original Arena card", () => {
  for (const action of ["accept", "decline", "shop", "equipment"]) {
    assert.equal(
      arenaControlBelongsToMatch({
        action,
        match,
        guildId: "guild",
        channelId: "arena",
        messageId: "different-message",
      }),
      false,
    );
    assert.equal(
      arenaControlBelongsToMatch({
        action,
        match,
        guildId: "guild",
        channelId: "arena",
        messageId: "public-arena-card",
      }),
      true,
    );
  }
});

test("tactic controls still require the correct guild and channel", () => {
  assert.equal(
    arenaControlBelongsToMatch({
      action: "tactic",
      match,
      guildId: "other-guild",
      channelId: "arena",
      messageId: "private-tactic-picker",
    }),
    false,
  );
  assert.equal(
    arenaControlBelongsToMatch({
      action: "tactic",
      match,
      guildId: "guild",
      channelId: "other-channel",
      messageId: "private-tactic-picker",
    }),
    false,
  );
});

test("only the latest public round control can open the tactic picker", () => {
  const moved = {
    ...match,
    control_message_id: "latest-round-card",
  };
  assert.equal(
    arenaControlBelongsToMatch({
      action: "open",
      match: moved,
      guildId: "guild",
      channelId: "arena",
      messageId: "public-arena-card",
    }),
    false,
  );
  assert.equal(
    arenaControlBelongsToMatch({
      action: "open",
      match: moved,
      guildId: "guild",
      channelId: "arena",
      messageId: "latest-round-card",
    }),
    true,
  );
});

test("a missing active control rejects every public tactic opener", () => {
  assert.equal(
    arenaControlBelongsToMatch({
      action: "open",
      match: { ...match, control_message_id: null },
      guildId: "guild",
      channelId: "arena",
      messageId: "public-arena-card",
    }),
    false,
  );
});
