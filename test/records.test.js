import assert from "node:assert/strict";
import test from "node:test";

import { buildRecordEmbed, displayName } from "../src/records.js";

const targetUser = {
  id: "100000000000000005",
  username: "example_target",
  globalName: "Example Target",
};

test("prefers a server display name for citation subjects", () => {
  assert.equal(
    displayName(targetUser, { displayName: "Example [ROLE]" }),
    "Example [ROLE]",
  );
  assert.equal(displayName(targetUser), "Example Target");
});

test("builds a public record with a jump link to the cited message", () => {
  const embed = buildRecordEmbed(targetUser, null, {
    total: 1,
    citations: [
      {
        id: 7,
        guildId: "100000000000000000",
        channelId: "100000000000000001",
        sourceMessageId: "100000000000000002",
        offenseLabel: "Low-Altitude Hostility",
        charge: "Trafficking in low-hanging fruit",
        finding: "Witnesses report the point passed directly overhead.",
        sentence: "One mandatory booster-seat inspection",
        createdAt: 1_785_256_000_000,
      },
    ],
  }).toJSON();

  assert.equal(embed.title, "📁 INTERGALACTIC CITATION RECORD");
  assert.match(embed.description, /Total citations:\*\* 1/);
  assert.match(
    embed.fields[0].value,
    /https:\/\/discord\.com\/channels\/100000000000000000\/100000000000000001\/100000000000000002/,
  );
  assert.match(embed.fields[0].value, /Bureau Finding/);
  assert.match(embed.fields[0].value, /passed directly overhead/);
  assert.equal(embed.footer, undefined);
});

test("builds an explicit clean record when no citations exist", () => {
  const embed = buildRecordEmbed(targetUser, null, {
    total: 0,
    citations: [],
  }).toJSON();

  assert.match(embed.fields[0].value, /Suspiciously clean/);
});
