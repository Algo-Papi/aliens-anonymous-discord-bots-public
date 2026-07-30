import assert from "node:assert/strict";
import test from "node:test";

import {
  ResearchContextError,
  assembleResearchContext,
  sanitizeText,
} from "../../src/research/context.js";

function message(id, authorId, content, createdTimestamp, reference = null) {
  return {
    id,
    channelId: "channel",
    createdTimestamp,
    content,
    embeds: [],
    webhookId: null,
    system: false,
    author: { id: authorId, bot: false },
    reference,
  };
}

function withChannel(messages, anchor) {
  const map = new Map(messages.map((item) => [item.id, item]));
  const channel = {
    messages: {
      async fetch(options) {
        if (typeof options === "string") {
          return map.get(options);
        }
        return new Map(messages.map((item) => [item.id, item]));
      },
    },
  };
  for (const item of messages) {
    item.channel = channel;
  }
  return anchor;
}

const limits = {
  focusedMessageLimit: 10,
  standardMessageLimit: 25,
  focusedCharacterLimit: 6_000,
  standardCharacterLimit: 12_000,
};

test("context pseudonymizes members and redacts common secrets", async () => {
  const parent = message("1", "100", "email me at test@example.com", 1);
  const anchor = message(
    "2",
    "200",
    "Ask <@100> and use sk-secretsecretsecret",
    2,
    { messageId: "1" },
  );
  const context = await assembleResearchContext({
    anchorMessage: withChannel([parent, anchor], anchor),
    scope: "focused",
    limits,
  });
  assert.match(context.transcript, /Participant A|Participant B/);
  assert.doesNotMatch(context.transcript, /test@example\.com/);
  assert.doesNotMatch(context.transcript, /sk-secret/);
  assert.match(context.transcript, /\[API key removed\]/);
  assert.equal(context.messageCount, 2);
});

test("standard context never exceeds 25 messages", async () => {
  const messages = Array.from({ length: 40 }, (_, index) =>
    message(String(index), String(1_000 + index), `message ${index}`, index),
  );
  const anchor = messages[20];
  const context = await assembleResearchContext({
    anchorMessage: withChannel(messages, anchor),
    scope: "standard",
    limits,
  });
  assert.equal(context.messageCount, 25);
  assert.ok(context.characterCount <= 12_000);
  assert.match(context.transcript, /\[SELECTED MESSAGE\]/);
});

test("opted-out surrounding messages are omitted and opted-out anchors fail", async () => {
  const surrounding = message("1", "100", "private preference", 1);
  const anchor = message("2", "200", "public anchor", 2);
  const anchorMessage = withChannel([surrounding, anchor], anchor);
  const context = await assembleResearchContext({
    anchorMessage,
    scope: "standard",
    limits,
    isOptedOut: (id) => id === "100",
  });
  assert.equal(context.omittedForPrivacy, 1);
  assert.doesNotMatch(context.transcript, /private preference/);

  await assert.rejects(
    assembleResearchContext({
      anchorMessage,
      scope: "standard",
      limits,
      isOptedOut: (id) => id === "200",
    }),
    (error) =>
      error instanceof ResearchContextError &&
      error.code === "ANCHOR_OPT_OUT",
  );
});

test("focused reply ancestry cannot reintroduce an opted-out parent", async () => {
  const parent = message("1", "100", "must stay private", 1);
  const anchor = message(
    "2",
    "200",
    "selected reply",
    2,
    { messageId: "1" },
  );
  const map = new Map([
    [parent.id, parent],
    [anchor.id, anchor],
  ]);
  const channel = {
    messages: {
      async fetch(options) {
        if (typeof options === "string") {
          return map.get(options);
        }
        return new Map([[anchor.id, anchor]]);
      },
    },
  };
  parent.channel = channel;
  anchor.channel = channel;
  const context = await assembleResearchContext({
    anchorMessage: anchor,
    scope: "focused",
    limits,
    isOptedOut: (id) => id === "100",
  });
  assert.doesNotMatch(context.transcript, /must stay private/);
  assert.equal(context.messageCount, 1);
});

test("sanitization removes invites but preserves ordinary public links", () => {
  const result = sanitizeText(
    "https://example.com and https://discord.gg/secret",
    () => "Participant A",
  );
  assert.match(result, /https:\/\/example\.com/);
  assert.match(result, /\[invite removed\]/);
});
