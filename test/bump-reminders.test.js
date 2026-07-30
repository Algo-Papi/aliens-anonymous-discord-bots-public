import assert from "node:assert/strict";
import test from "node:test";

import {
  buildBumpAcknowledgement,
  buildBumpReminderPayload,
  dueBumpReminderSlot,
  isSuccessfulDisboardBump,
  parseBumpReminderTimes,
} from "../src/bump-reminders.js";

test("parses, sorts, and validates bump reminder times", () => {
  assert.deepEqual(
    parseBumpReminderTimes("20:00,08:00,12:00,08:00"),
    ["08:00", "12:00", "20:00"],
  );
  assert.throws(
    () => parseBumpReminderTimes("8:00"),
    /Invalid bump reminder time/,
  );
});

test("finds only the current Eastern-time reminder slot within grace", () => {
  const options = {
    timeZone: "America/New_York",
    times: ["00:00", "08:00", "12:00", "16:00", "20:00"],
    graceMinutes: 10,
  };
  assert.deepEqual(
    dueBumpReminderSlot({
      ...options,
      now: new Date("2026-07-29T12:04:00.000Z"),
    }),
    {
      key: "2026-07-29@08:00",
      dateKey: "2026-07-29",
      time: "08:00",
    },
  );
  assert.equal(
    dueBumpReminderSlot({
      ...options,
      now: new Date("2026-07-29T12:10:00.000Z"),
    }),
    null,
  );
  assert.equal(
    dueBumpReminderSlot({
      ...options,
      now: new Date("2026-07-29T04:05:00.000Z"),
    })?.time,
    "00:00",
  );
});

test("builds a mention-restricted voluntary reminder with role controls", () => {
  const payload = buildBumpReminderPayload({
    roleId: "123",
    slotKey: "2026-07-29@08:00",
    times: ["08:00", "12:00"],
    timeZone: "America/New_York",
  });
  assert.equal(payload.content, "<@&123>");
  assert.deepEqual(payload.allowedMentions.roles, ["123"]);
  assert.match(payload.embeds[0].data.description, /human volunteer/);
  assert.equal(payload.components[0].components.length, 2);
});

test("recognizes successful DISBOARD messages without counting cooldown errors", () => {
  const author = { id: "disboard" };
  assert.equal(
    isSuccessfulDisboardBump(
      {
        author,
        content: "",
        embeds: [{ title: "Bump done!", description: "Thanks!" }],
      },
      "disboard",
    ),
    true,
  );
  assert.equal(
    isSuccessfulDisboardBump(
      {
        author,
        content: "Please wait before bumping again.",
        embeds: [],
      },
      "disboard",
    ),
    false,
  );
});

test("bump acknowledgement includes the buffered next-window timestamp", () => {
  const acknowledgement = buildBumpAcknowledgement({
    messageId: "message",
    bumpedAt: 1_000,
    cooldownMs: 7_380_000,
  });
  assert.match(acknowledgement, /<t:7381:R>/);
});
