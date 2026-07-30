import assert from "node:assert/strict";
import test from "node:test";

import {
  archiveHeader,
  buildArchivePayload,
} from "../src/archive.js";

function fakeMessage(overrides = {}) {
  return {
    id: "111111111111111111",
    guildId: "222222222222222222",
    channelId: "333333333333333333",
    channel: { name: "aliens" },
    content: "A useful archived observation.",
    url: "https://discord.com/channels/222/333/111",
    createdAt: new Date("2026-07-28T16:00:00Z"),
    author: {
      id: "444444444444444444",
      username: "observer",
      globalName: "Observer",
      displayAvatarURL: () => "https://cdn.discordapp.com/avatar.png",
    },
    member: { displayName: "Field Observer" },
    attachments: new Map(),
    embeds: [],
    ...overrides,
  };
}

test("archive header preserves the source channel and star count", () => {
  const message = fakeMessage();
  assert.equal(
    archiveHeader(message, 3),
    "⭐ **3** | <#333333333333333333>",
  );
});

test("archive payload includes the content, author, and jump link", async () => {
  const payload = await buildArchivePayload(fakeMessage(), 1);
  const embed = payload.embeds[0].toJSON();

  assert.equal(payload.content, "⭐ **1** | <#333333333333333333>");
  assert.equal(embed.author.name, "Field Observer");
  assert.match(embed.description, /A useful archived observation/);
  assert.match(embed.description, /Jump to the original message/);
  assert.equal(payload.files.length, 0);
  assert.deepEqual(payload.allowedMentions, { parse: [] });
});

test("media-only messages get a readable fallback description", async () => {
  const payload = await buildArchivePayload(
    fakeMessage({ content: "" }),
    1,
  );
  assert.match(
    payload.embeds[0].toJSON().description,
    /Media-only message/,
  );
});
