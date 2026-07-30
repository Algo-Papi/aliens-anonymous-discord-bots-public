import assert from "node:assert/strict";
import test from "node:test";

import {
  FALLBACK_WITNESSES,
  RecentActivity,
  recencyWeight,
} from "../../src/activity/recent-activity.js";

test("recency weights match the six planned bands", () => {
  assert.equal(recencyWeight(5 * 60_000), 6);
  assert.equal(recencyWeight(10 * 60_000), 5);
  assert.equal(recencyWeight(15 * 60_000), 4);
  assert.equal(recencyWeight(20 * 60_000), 3);
  assert.equal(recencyWeight(25 * 60_000), 2);
  assert.equal(recencyWeight(30 * 60_000), 1);
});

test("recent activity excludes invoker and target", async () => {
  const nowMs = 10_000_000;
  const tracker = new RecentActivity({
    now: () => nowMs,
    randomInt: (min) => min,
  });
  for (const userId of ["invoker", "target", "eligible"]) {
    tracker.record({
      guildId: "guild",
      channelId: "channel",
      userId,
      nowMs: nowMs - 1_000,
    });
  }
  const witness = await tracker.selectWitness({
    guildId: "guild",
    channelId: "channel",
    invokerId: "invoker",
    targetId: "target",
    isEligible: async (userId) => userId === "eligible",
    nowMs,
  });
  assert.deepEqual(witness, {
    kind: "member",
    userId: "eligible",
    text: "<@eligible>",
  });
});

test("empty activity uses a fictional fallback", async () => {
  assert.equal(FALLBACK_WITNESSES.length, 10);
  assert.equal(new Set(FALLBACK_WITNESSES).size, 10);
  const tracker = new RecentActivity({ randomInt: (min) => min });
  const witness = await tracker.selectWitness({
    guildId: "guild",
    channelId: "channel",
    invokerId: "invoker",
    targetId: "target",
    isEligible: async () => false,
  });
  assert.equal(witness.kind, "fallback");
  assert.ok(FALLBACK_WITNESSES.includes(witness.text));
});
