import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { EarthIntelStore } from "../src/intel/store.js";

function sampleCandidate(id = "item-1") {
  return {
    id,
    source: {
      key: "usgs",
      family: "usgs",
      label: "USGS",
    },
    title: "Significant earthquake",
    url: `https://example.test/${id}`,
    publishedAt: 1_785_254_400_000,
  };
}

test("Earth Intel store seeds without backfill and tracks source recovery", () => {
  const directory = mkdtempSync(join(tmpdir(), "aa-earth-intel-"));
  const store = new EarthIntelStore(join(directory, "intel.sqlite"));
  try {
    const now = 1_785_254_500_000;
    store.initializeSource("usgs", [sampleCandidate()], now);
    assert.equal(store.isSourceInitialized("usgs"), true);
    assert.equal(store.hasCandidate("usgs", "item-1"), true);

    const failed = store.markSourceFailure({
      sourceKey: "usgs",
      error: new Error("temporary outage"),
      attemptedAt: now + 1,
      nextAttemptAt: now + 60_000,
    });
    assert.equal(failed.consecutiveFailures, 1);
    assert.equal(failed.circuitState, "open");

    const recovered = store.markSourceSuccess({
      sourceKey: "usgs",
      attemptedAt: now + 2,
      lastItemAt: now,
      etag: '"event-feed"',
    });
    assert.equal(recovered.previous.consecutiveFailures, 1);
    assert.equal(recovered.current.consecutiveFailures, 0);
    assert.equal(recovered.current.circuitState, "closed");
    assert.equal(recovered.current.etag, '"event-feed"');
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("Earth Intel store persists stories and idempotent outbox work", () => {
  const directory = mkdtempSync(join(tmpdir(), "aa-earth-intel-"));
  const store = new EarthIntelStore(join(directory, "intel.sqlite"));
  try {
    const now = 1_785_254_500_000;
    const candidate = sampleCandidate("item-2");
    store.saveCandidate({
      candidate,
      storyKey: "earthquake-california",
      status: "pending",
      discoveredAt: now,
    });
    store.upsertStory({
      storyKey: "earthquake-california",
      title: candidate.title,
      fingerprint: ["earthquake", "california"],
      reliability: "confirmed",
      sourceFamilies: ["usgs"],
      discordChannelId: "channel",
      discordMessageId: "message",
      createdAt: now,
      updatedAt: now,
      lastCandidateAt: now,
    });
    assert.deepEqual(
      store.getStory("earthquake-california").fingerprint,
      ["earthquake", "california"],
    );

    assert.equal(
      store.queueOutbox({
        sourceKey: "usgs",
        itemId: "item-2",
        storyKey: "earthquake-california",
        action: "create",
        payload: { candidate },
        createdAt: now,
      }),
      true,
    );
    assert.equal(
      store.queueOutbox({
        sourceKey: "usgs",
        itemId: "item-2",
        storyKey: "earthquake-california",
        action: "create",
        payload: { candidate },
        createdAt: now,
      }),
      false,
    );
    const [entry] = store.getPendingOutbox();
    assert.equal(store.markOutboxSending(entry.id, now + 1), true);
    store.markOutboxSent(entry.id, "discord-message", now + 2);
    assert.equal(store.countPublishedSince(now), 1);

    store.updateCandidateDelivery({
      sourceKey: "usgs",
      itemId: "item-2",
      status: "published",
      discordMessageId: "discord-message",
    });
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("Earth Intel store keeps one operational incident per failure key", () => {
  const directory = mkdtempSync(join(tmpdir(), "aa-earth-intel-"));
  const store = new EarthIntelStore(join(directory, "intel.sqlite"));
  try {
    const now = 1_785_254_500_000;
    store.openIncident({
      incidentKey: "source:nitter",
      severity: "warning",
      details: { message: "unavailable" },
      openedAt: now,
    });
    store.openIncident({
      incidentKey: "source:nitter",
      severity: "critical",
      details: { message: "still unavailable" },
      openedAt: now + 1,
    });
    assert.equal(store.getOpenIncidents().length, 1);
    assert.equal(store.getIncident("source:nitter").severity, "critical");
    assert.equal(
      store.resolveIncident(
        "source:nitter",
        { message: "recovered" },
        now + 2,
      ),
      true,
    );
    assert.equal(store.getOpenIncidents().length, 0);
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
