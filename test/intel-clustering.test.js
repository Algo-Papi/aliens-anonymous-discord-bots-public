import assert from "node:assert/strict";
import test from "node:test";

import {
  canonicalizeStoryUrl,
  clusterStories,
  headlineTokens,
  shouldClusterStories,
  storyFingerprint,
  storySimilarity,
} from "../src/intel/index.js";
import { classifyCandidate } from "../src/intel/classifier.js";

test("canonicalizes tracking variants and legacy Twitter URLs", () => {
  assert.equal(
    canonicalizeStoryUrl(
      "http://www.twitter.com/example/status/42/?utm_source=test#video",
    ),
    "https://x.com/example/status/42",
  );
});

test("headline tokens remove alert prefixes and common filler", () => {
  assert.deepEqual(
    headlineTokens(
      "BREAKING: FAA grounds flights at major U.S. airports",
    ),
    ["faa", "grounds", "flights", "major", "us", "airports"],
  );
});

test("fingerprints are stable across event-key order", () => {
  const left = storyFingerprint({
    eventKeys: ["FAA outage", "US flights"],
    title: "First title",
  });
  const right = storyFingerprint({
    eventKeys: ["US flights", "FAA outage"],
    title: "Different title",
  });
  assert.equal(left, right);
});

test("clusters independent headlines about the same event", () => {
  const left = {
    title: "FAA grounds flights at major US airports after outage",
    publishedAt: "2026-07-28T12:00:00Z",
    entities: ["FAA", "United States"],
  };
  const right = {
    title: "Major US airports see flights grounded following FAA outage",
    publishedAt: "2026-07-28T12:15:00Z",
    entities: ["FAA", "United States"],
  };
  assert.ok(storySimilarity(left, right) >= 0.55);
  assert.equal(shouldClusterStories(left, right), true);
});

test("does not cluster generic short or stale headlines", () => {
  assert.equal(
    shouldClusterStories(
      {
        title: "Major outage reported",
        publishedAt: "2026-07-28T12:00:00Z",
      },
      {
        title: "Major outage reported",
        publishedAt: "2026-07-28T12:05:00Z",
      },
    ),
    false,
  );
  assert.equal(
    shouldClusterStories(
      {
        title: "FAA grounds flights at major US airports",
        publishedAt: "2026-07-20T12:00:00Z",
      },
      {
        title: "FAA grounds flights at major US airports",
        publishedAt: "2026-07-28T12:00:00Z",
      },
    ),
    false,
  );
});

test("clusters transitive story updates into one card", () => {
  const stories = [
    {
      title: "FAA outage grounds flights at major US airports",
      publishedAt: "2026-07-28T12:00:00Z",
      eventKeys: ["faa-2026-07-28"],
    },
    {
      title: "FAA restores systems after national flight outage",
      publishedAt: "2026-07-28T13:00:00Z",
      eventKeys: ["faa-2026-07-28", "flight-restoration"],
    },
    {
      title: "Flights resume as FAA restoration completes",
      publishedAt: "2026-07-28T14:00:00Z",
      eventKeys: ["flight-restoration"],
    },
    {
      title: "NASA announces new telescope target list",
      publishedAt: "2026-07-28T14:00:00Z",
    },
  ];
  const clusters = clusterStories(stories);
  assert.deepEqual(
    clusters.map((cluster) => cluster.length),
    [3, 1],
  );
});

test("clusters casualty counts written with digits or words", () => {
  const left = {
    title: "UPDATE: 2 dead, 5 injured after Seattle Center shooting - KOMO",
    publishedAt: "2026-07-28T20:00:00.000Z",
  };
  const right = {
    title:
      "Two people have been killed and five injured, including a child, in a shooting at the Seattle Center, officials say",
    publishedAt: "2026-07-28T20:10:00.000Z",
  };
  assert.equal(
    shouldClusterStories(left, right, { minimumSimilarity: 0.58 }),
    true,
  );
});

test("clusters independently worded reports of the same US missile attack", () => {
  const left = classifyCandidate({
    sourceKey: "osintdefender",
    source: { key: "osintdefender" },
    title:
      "Iran launched missiles toward a U.S. base in Jordan, an American official says",
    url: "https://x.com/sentdefender/status/1",
    publishedAt: "2026-07-28T20:00:00.000Z",
  });
  const right = classifyCandidate({
    sourceKey: "osinttechnical",
    source: { key: "osinttechnical" },
    title:
      "CENTCOM says Iranian forces carried out a surprise ballistic missile attack on US bases in Jordan tonight",
    url: "https://x.com/Osinttechnical/status/2",
    publishedAt: "2026-07-28T20:10:00.000Z",
  });
  assert.equal(
    shouldClusterStories(left, right, { minimumSimilarity: 0.58 }),
    true,
  );
});
