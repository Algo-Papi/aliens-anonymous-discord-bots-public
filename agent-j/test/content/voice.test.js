import assert from "node:assert/strict";
import test from "node:test";

import {
  MEMORY_OPENERS,
  pickVoice,
  REPORT_FOOTERS,
  SCAN_OPENERS,
  THREAT_OPENERS,
} from "../../src/content/voice.js";

const VOICE_POOLS = [SCAN_OPENERS, MEMORY_OPENERS, THREAT_OPENERS];

test("Agent J report voice pools are varied, unique, and immutable", () => {
  for (const pool of VOICE_POOLS) {
    assert.equal(pool.length, 13);
    assert.equal(new Set(pool).size, pool.length);
    assert.equal(Object.isFrozen(pool), true);
    assert.ok(pool.every((line) => line.length > 20));
  }
  assert.equal(Object.isFrozen(REPORT_FOOTERS), true);
  for (const footers of Object.values(REPORT_FOOTERS)) {
    assert.equal(footers.length, 6);
    assert.equal(new Set(footers.map((entry) => entry.text)).size, 6);
    assert.equal(Object.isFrozen(footers), true);
  }
});

test("Agent J voice pools do not depend on recognizable film quotations", () => {
  const allLines = VOICE_POOLS.flat();
  assert.ok(
    allLines.every((line) => !line.includes("I make this look good.")),
  );
});

test("voice selection uses the injected random source", () => {
  const selected = pickVoice(SCAN_OPENERS, {
    int(min, max) {
      assert.equal(min, 0);
      assert.equal(max, SCAN_OPENERS.length);
      return 2;
    },
  });
  assert.equal(selected, SCAN_OPENERS[2]);
});
