import assert from "node:assert/strict";
import test from "node:test";

import { ReportCooldowns } from "../../src/security/cooldowns.js";

function request(overrides = {}) {
  return {
    guildId: "guild",
    channelId: "channel",
    command: "scan",
    invokerId: "invoker",
    targetId: "target",
    ...overrides,
  };
}

test("reservations prevent races and release after failed delivery", () => {
  let nowMs = 1_000_000;
  let nextId = 0;
  const cooldowns = new ReportCooldowns({
    now: () => nowMs,
    idFactory: () => `reservation-${++nextId}`,
  });

  const first = cooldowns.reserve(request());
  assert.equal(first.ok, true);
  assert.equal(cooldowns.reserve(request()).ok, false);
  assert.equal(cooldowns.release(first.token), true);
  const retried = cooldowns.reserve(request());
  assert.equal(retried.ok, true);
  assert.equal(cooldowns.commit(retried.token), true);
  const blocked = cooldowns.reserve(request());
  assert.equal(blocked.ok, false);
  assert.equal(blocked.scope, "invoker");

  nowMs += 46_000;
  assert.equal(
    cooldowns.reserve(
      request({ invokerId: "other", targetId: "different" }),
    ).ok,
    true,
  );
});

test("self-targeting bypasses pair and target-wide limits", () => {
  let nowMs = 5_000_000;
  let nextId = 0;
  const cooldowns = new ReportCooldowns({
    now: () => nowMs,
    idFactory: () => `self-${++nextId}`,
  });
  const first = cooldowns.reserve(
    request({ invokerId: "self", targetId: "self" }),
  );
  cooldowns.commit(first.token);

  nowMs += 46_000;
  const second = cooldowns.reserve(
    request({ invokerId: "self", targetId: "self" }),
  );
  assert.equal(second.ok, true);
});

test("eight reports in a rolling hour reserve the target cap atomically", () => {
  let nowMs = 20_000_000;
  let nextId = 0;
  const cooldowns = new ReportCooldowns({
    now: () => nowMs,
    idFactory: () => `cap-${++nextId}`,
  });

  for (let index = 0; index < 8; index += 1) {
    const reserved = cooldowns.reserve(
      request({
        channelId: `channel-${index}`,
        invokerId: `invoker-${index}`,
      }),
    );
    assert.equal(reserved.ok, true);
    cooldowns.commit(reserved.token);
    nowMs += 91_000;
  }

  const ninth = cooldowns.reserve(
    request({
      channelId: "channel-nine",
      invokerId: "invoker-nine",
    }),
  );
  assert.equal(ninth.ok, false);
  assert.equal(ninth.scope, "hourly_target_cap");
});
