import assert from "node:assert/strict";
import test from "node:test";

import {
  enrichIntelCandidate,
  isIntelSourceDue,
} from "../src/intel/monitor.js";

test("source scheduling respects intervals and failure backoff", () => {
  const source = { intervalMs: 300_000 };
  const now = 1_785_254_500_000;
  assert.equal(isIntelSourceDue(source, null, now), true);
  assert.equal(
    isIntelSourceDue(
      source,
      { lastAttemptAt: now - 299_999, nextAttemptAt: null },
      now,
    ),
    false,
  );
  assert.equal(
    isIntelSourceDue(
      source,
      { lastAttemptAt: now - 500_000, nextAttemptAt: now + 1 },
      now,
    ),
    false,
  );
});

test("candidate enrichment adds editorial family without credentials", () => {
  const enriched = enrichIntelCandidate(
    {
      id: "x:1",
      source: { key: "bno-desk", label: "BNO Desk" },
      title: "Report",
    },
    {
      key: "bno-desk",
      label: "BNO News Live / Desk",
      handle: "BNODesk",
      kind: "social",
      intervalMs: 300_000,
    },
  );
  assert.equal(enriched.source.family, "bno");
  assert.equal(enriched.source.evidenceQuality, "high");
  assert.equal(
    Object.keys(enriched.source).some((key) =>
      /token|cookie|password/i.test(key),
    ),
    false,
  );
});
