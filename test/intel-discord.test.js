import assert from "node:assert/strict";
import test from "node:test";

import {
  EARTH_INTEL_REGISTRY_MARKER,
  buildEarthIntelPayload,
  buildEarthIntelRegistryPayload,
  buildEarthIntelTestPayload,
  earthIntelThreadName,
} from "../src/intel/discord.js";

const candidate = {
  id: "x:1",
  eventId: "1",
  sourceKey: "reuters",
  source: { key: "reuters", label: "Reuters" },
  title: "Major U.S. infrastructure disruption",
  summary: "A concise developing report.",
  url: "https://x.com/Reuters/status/1",
  canonicalUrl: "https://x.com/Reuters/status/1",
  publishedAt: "2026-07-28T18:00:00.000Z",
  media: [],
};

const decision = {
  reliability: { label: "early-report" },
  eligibility: { qualifyingReasons: ["direct-us-impact"] },
};

test("Earth Intel cards use embedded links and suppress every mention", async () => {
  const payload = await buildEarthIntelPayload({ candidate, decision });
  assert.deepEqual(payload.allowedMentions, { parse: [] });
  assert.equal(payload.embeds[0].data.url, candidate.url);
  assert.match(payload.embeds[0].data.fields[2].value, /\[Open the original report\]/);
  assert.equal(payload.content.includes("@everyone"), false);
});

test("registry is generated from the active source list", () => {
  const payload = buildEarthIntelRegistryPayload([
    { kind: "social", label: "Reuters", handle: "Reuters" },
    { kind: "official", label: "USGS" },
  ]);
  const data = payload.embeds[0].data;
  assert.match(data.fields[0].value, /Reuters/);
  assert.match(data.fields[1].value, /USGS/);
  assert.match(data.footer.text, new RegExp(EARTH_INTEL_REGISTRY_MARKER));
  assert.deepEqual(payload.allowedMentions, { parse: [] });
});

test("test alert is unmistakably synthetic and mention-safe", () => {
  const payload = buildEarthIntelTestPayload();
  assert.match(payload.content, /NOT A REAL ALERT/);
  assert.match(payload.embeds[0].data.description, /not a real breaking-news event/i);
  assert.deepEqual(payload.allowedMentions, { parse: [] });
});

test("discussion thread names are bounded and cannot inject mentions", () => {
  const name = earthIntelThreadName("@everyone #breaking ".repeat(20));
  assert.ok(name.length <= 100);
  assert.equal(name.includes("@"), false);
  assert.equal(name.includes("#"), false);
});
