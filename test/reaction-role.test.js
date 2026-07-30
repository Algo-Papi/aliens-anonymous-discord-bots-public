import assert from "node:assert/strict";
import test from "node:test";

import { isFieldClearanceReaction } from "../src/reaction-role.js";

const config = {
  guildId: "guild",
  qAndAChannelId: "q-and-a",
  fieldClearanceMessageId: "message",
  fieldClearanceEmoji: "🕶️",
};

test("matches the configured self-service role reaction", () => {
  assert.equal(
    isFieldClearanceReaction(
      {
        guildId: "guild",
        channelId: "q-and-a",
        messageId: "message",
        emojiName: "🕶️",
      },
      config,
    ),
    true,
  );
});

test("rejects bot reactions and reactions outside the exact guide message", () => {
  for (const candidate of [
    { guildId: "other" },
    { channelId: "other" },
    { messageId: "other" },
    { emojiName: "⭐" },
    { userIsBot: true },
  ]) {
    assert.equal(
      isFieldClearanceReaction(
        {
          guildId: "guild",
          channelId: "q-and-a",
          messageId: "message",
          emojiName: "🕶️",
          userIsBot: false,
          ...candidate,
        },
        config,
      ),
      false,
    );
  }
});
