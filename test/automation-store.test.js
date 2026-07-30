import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { AutomationStore } from "../src/automation-store.js";

test("automation store tracks feed initialization and archived messages", () => {
  const directory = mkdtempSync(join(tmpdir(), "aa-automation-"));
  const store = new AutomationStore(join(directory, "automation.sqlite"));
  try {
    assert.equal(store.isFeedInitialized("uapgerb"), false);
    store.initializeFeed("uapgerb", [
      { id: "post-1", publishedAt: 1_785_254_400_000 },
    ]);
    assert.equal(store.isFeedInitialized("uapgerb"), true);
    assert.equal(store.hasFeedItem("uapgerb", "post-1"), true);
    assert.equal(store.hasFeedItem("uapgerb", "post-2"), false);

    store.rememberFeedItem("uapgerb", {
      id: "post-2",
      publishedAt: 1_785_254_500_000,
    });
    assert.equal(store.hasFeedItem("uapgerb", "post-2"), true);

    const now = Date.now();
    store.saveArchiveEntry({
      guildId: "guild",
      sourceChannelId: "source-channel",
      sourceMessageId: "source-message",
      archiveChannelId: "archive-channel",
      archiveMessageId: "archive-message",
      starCount: 1,
      createdAt: now,
      updatedAt: now,
    });
    assert.equal(
      store.getArchiveEntry("guild", "source-message").starCount,
      1,
    );
    store.setArchiveStarCount("guild", "source-message", 4, now + 1);
    assert.equal(
      store.getArchiveEntry("guild", "source-message").starCount,
      4,
    );

    assert.equal(
      store.claimBumpReminder("2026-07-29@08:00", "thunderdome", now),
      true,
    );
    assert.equal(
      store.claimBumpReminder("2026-07-29@08:00", "thunderdome", now),
      false,
    );
    store.completeBumpReminder(
      "2026-07-29@08:00",
      { status: "sent", messageId: "reminder-message" },
      now + 1,
    );
    assert.equal(
      store.getBumpReminder("2026-07-29@08:00").messageId,
      "reminder-message",
    );

    assert.equal(
      store.rememberDisboardBump({
        messageId: "disboard-message",
        channelId: "thunderdome",
        bumpedAt: now + 2,
      }),
      true,
    );
    assert.equal(
      store.rememberDisboardBump({
        messageId: "disboard-message",
        channelId: "thunderdome",
        bumpedAt: now + 2,
      }),
      false,
    );
    assert.equal(
      store.getLatestDisboardBump().messageId,
      "disboard-message",
    );
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
