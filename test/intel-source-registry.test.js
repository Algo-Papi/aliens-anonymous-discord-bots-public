import assert from "node:assert/strict";
import test from "node:test";

import {
  EARTH_INTEL_SOURCES,
  PUBLICATION_MODES,
  getIntelSource,
  getSourceFamily,
} from "../src/intel/index.js";

test("source registry keys are unique and immutable", () => {
  const keys = EARTH_INTEL_SOURCES.map(({ key }) => key);
  assert.equal(new Set(keys).size, keys.length);
  assert.equal(Object.isFrozen(EARTH_INTEL_SOURCES), true);
  assert.equal(Object.isFrozen(EARTH_INTEL_SOURCES[0]), true);
  assert.equal(Object.isFrozen(EARTH_INTEL_SOURCES[0].topics), true);
});

test("accounts under common editorial control share a family", () => {
  assert.equal(getSourceFamily("bno-news"), "bno");
  assert.equal(getSourceFamily("bno-desk"), "bno");
  assert.equal(getSourceFamily("nws"), "noaa");
  assert.equal(getSourceFamily("nhc"), "noaa");
  assert.equal(getSourceFamily("dod"), "department-of-defense");
  assert.equal(getSourceFamily("centcom"), "department-of-defense");
});

test("global regional sensors are corroboration-only", () => {
  for (const key of ["gdacs", "who", "reliefweb"]) {
    assert.equal(
      getIntelSource(key).publicationMode,
      PUBLICATION_MODES.CORROBORATION_ONLY,
    );
  }
});
