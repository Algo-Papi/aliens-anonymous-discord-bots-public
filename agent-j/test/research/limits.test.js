import assert from "node:assert/strict";
import test from "node:test";

import { ResearchLimits } from "../../src/security/research-limits.js";

test("research limits enforce one job per user, two globally, and cooldown", () => {
  let now = 100_000;
  const limits = new ResearchLimits({
    now: () => now,
    cooldownMs: 60_000,
    maxConcurrentJobs: 2,
  });
  assert.equal(limits.reserve("a").ok, true);
  assert.equal(limits.reserve("a").code, "USER_ACTIVE");
  assert.equal(limits.reserve("b").ok, true);
  assert.equal(limits.reserve("c").code, "SERVER_BUSY");
  assert.equal(limits.complete("a"), true);
  assert.equal(limits.reserve("a").code, "COOLDOWN");
  limits.release("b");
  now += 60_000;
  assert.equal(limits.reserve("a").ok, true);
});
