import assert from "node:assert/strict";
import test from "node:test";

import {
  EARTH_INTEL_RUNTIME_SOURCES,
  getRuntimeIntelSource,
} from "../src/intel/runtime-sources.js";

test("runtime roster is exact, unique, and entirely credential-free", () => {
  const keys = EARTH_INTEL_RUNTIME_SOURCES.map((source) => source.key);
  assert.equal(new Set(keys).size, keys.length);
  assert.deepEqual(keys, [
    "bno-news",
    "bno-desk",
    "osintdefender",
    "faytuks",
    "osinttechnical",
    "the-intel-frog",
    "ap",
    "reuters",
    "bbc-breaking",
    "usgs",
    "nws",
    "nhc",
    "noaa-space-weather",
  ]);
  assert.ok(
    EARTH_INTEL_RUNTIME_SOURCES.every(
      (source) =>
        !Object.keys(source).some((key) =>
          /token|cookie|password|credential/i.test(key),
        ),
    ),
  );
  assert.equal(getRuntimeIntelSource("usgs").kind, "official");
});
