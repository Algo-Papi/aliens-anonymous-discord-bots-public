import assert from "node:assert/strict";
import test from "node:test";

import { ResearchService } from "../../src/research/service.js";

test("research service forwards the tier and logs cache-aware usage", async () => {
  let providerInput;
  let logEntry;
  const clock = [1_000, 1_125];
  const service = new ResearchService({
    config: {
      research: {
        focusedMessageLimit: 10,
        standardMessageLimit: 25,
        focusedCharacterLimit: 6_000,
        standardCharacterLimit: 12_000,
      },
    },
    userStore: {
      peekPrivacy() {
        return { aiContextOptOut: false };
      },
    },
    provider: {
      async run(value) {
        providerInput = value;
        return {
          markdown: "Verified",
          sources: [{ url: "https://example.com" }],
          webSearchCalls: 1,
          model: "gpt-5.6-terra",
          tier: "deep",
          usage: {
            input_tokens: 500,
            output_tokens: 100,
            input_tokens_details: {
              cached_tokens: 200,
              cache_write_tokens: 75,
            },
            output_tokens_details: { reasoning_tokens: 20 },
          },
        };
      },
    },
    logger: {
      info(event, fields) {
        logEntry = { event, fields };
      },
    },
    now: () => clock.shift(),
  });

  await service.run({
    guildId: "guild",
    userId: "analyst",
    anchorMessage: {
      id: "message",
      channelId: "channel",
      content: "A factual claim",
      createdTimestamp: 100,
      author: { id: "participant", bot: false },
    },
    mode: "research",
    scope: "focused",
    tier: "deep",
    question: "Verify this.",
  });

  assert.equal(providerInput.tier, "deep");
  assert.equal(logEntry.event, "research_completed");
  assert.equal(logEntry.fields.tier, "deep");
  assert.equal(logEntry.fields.cachedInputTokens, 200);
  assert.equal(logEntry.fields.cacheWriteInputTokens, 75);
  assert.equal(logEntry.fields.reasoningTokens, 20);
  assert.equal(logEntry.fields.latencyMs, 125);
});
