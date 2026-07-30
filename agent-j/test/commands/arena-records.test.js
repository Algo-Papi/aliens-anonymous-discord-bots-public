import assert from "node:assert/strict";
import test from "node:test";

import { InteractionController } from "../../src/commands/controller.js";

function completedMatch(overrides = {}) {
  return {
    id: "match",
    guild_id: "guild",
    channel_id: "thunderdome",
    message_id: "live-card",
    archive_message_id: null,
    challenger_id: "challenger",
    opponent_id: "opponent",
    challenger_round_wins: 2,
    opponent_round_wins: 1,
    challenger_reward: 10,
    opponent_reward: 3,
    winner_id: "challenger",
    status: "complete",
    match_mode: "standard",
    ranked: 1,
    ...overrides,
  };
}

test("completed fights are archived once and the live card is queued", async () => {
  const sent = [];
  const queued = [];
  const logs = [];
  const match = completedMatch();
  const arenaStore = {
    getMatch: () => match,
    getRounds: () => [],
    setArchiveMessageId: (_matchId, messageId) => ({
      ...match,
      archive_message_id: messageId,
    }),
    queueMessageCleanup: (job) => queued.push(job),
  };
  const controller = new InteractionController({
    client: {
      channels: {
        fetch: async (channelId) => {
          assert.equal(channelId, "records");
          return {
            id: channelId,
            isTextBased: () => true,
            send: async (payload) => {
              sent.push(payload);
              return {
                id: "archive-card",
                delete: async () => {},
              };
            },
          };
        },
      },
    },
    config: {
      arenaResultsChannelId: "records",
      arenaCleanupDelayMs: 300_000,
    },
    arenaStore,
    logger: {
      info: (event, details) => logs.push({ event, details }),
      error: () => {},
    },
  });

  assert.equal(await controller.archiveCompletedMatch(match), true);
  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0].allowedMentions, { parse: [], users: [] });
  assert.equal(queued[0].messageId, "live-card");
  assert.equal(logs[0].event, "arena_result_archived");
});

test("due live Arena cards are deleted and removed from the queue", async () => {
  const completed = [];
  let deleted = 0;
  const arenaStore = {
    getDueMessageCleanup: () => [
      {
        match_id: "match",
        channel_id: "thunderdome",
        message_id: "live-card",
        attempts: 0,
      },
    ],
    completeMessageCleanup: (messageId) => completed.push(messageId),
    retryMessageCleanup: () => {
      throw new Error("cleanup should not retry");
    },
  };
  const controller = new InteractionController({
    client: {
      channels: {
        fetch: async () => ({
          isTextBased: () => true,
          messages: {
            fetch: async () => ({
              delete: async () => {
                deleted += 1;
              },
            }),
          },
        }),
      },
    },
    config: {},
    arenaStore,
    logger: { info: () => {}, error: () => {} },
  });

  assert.equal(await controller.sweepArenaMessageCleanup(), 1);
  assert.equal(deleted, 1);
  assert.deepEqual(completed, ["live-card"]);
});
