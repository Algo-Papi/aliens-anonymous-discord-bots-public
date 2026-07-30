import assert from "node:assert/strict";
import test from "node:test";

import {
  EVIDENCE_POSITIONS,
  RELIABILITY_LABELS,
  assessReliability,
} from "../src/intel/index.js";

test("same-family accounts do not manufacture corroboration", () => {
  const result = assessReliability([
    { sourceKey: "bno-news" },
    { sourceKey: "bno-desk" },
  ]);
  assert.equal(result.supportFamilyCount, 1);
  assert.equal(result.label, RELIABILITY_LABELS.EARLY_REPORT);
});

test("independent medium-quality reports remain developing", () => {
  const result = assessReliability([
    { sourceKey: "osintdefender" },
    { sourceKey: "faytuks" },
  ]);
  assert.equal(result.supportFamilyCount, 2);
  assert.equal(result.label, RELIABILITY_LABELS.DEVELOPING);
});

test("independent high-quality reporting is corroborated", () => {
  const result = assessReliability([
    { sourceKey: "ap" },
    { sourceKey: "reuters" },
  ]);
  assert.equal(result.label, RELIABILITY_LABELS.CORROBORATED);
});

test("an official source alone is an official claim", () => {
  const result = assessReliability([{ sourceKey: "cisa" }]);
  assert.equal(result.label, RELIABILITY_LABELS.OFFICIAL_CLAIM);
});

test("a global official sensor remains an official claim source", () => {
  const result = assessReliability([{ sourceKey: "who" }]);
  assert.equal(result.label, RELIABILITY_LABELS.OFFICIAL_CLAIM);
});

test("official evidence plus independent high-quality reporting is confirmed", () => {
  const result = assessReliability([
    { sourceKey: "cisa" },
    { sourceKey: "reuters" },
  ]);
  assert.equal(result.label, RELIABILITY_LABELS.CONFIRMED);
});

test("independent contradiction changes the label to disputed", () => {
  const result = assessReliability([
    { sourceKey: "ap" },
    {
      sourceKey: "reuters",
      position: EVIDENCE_POSITIONS.DISPUTES,
    },
  ]);
  assert.equal(result.label, RELIABILITY_LABELS.DISPUTED);
});

test("a correction takes precedence over other evidence states", () => {
  const result = assessReliability([
    { sourceKey: "ap" },
    {
      sourceKey: "reuters",
      position: EVIDENCE_POSITIONS.DISPUTES,
    },
    {
      sourceKey: "bno-news",
      position: EVIDENCE_POSITIONS.CORRECTS,
    },
  ]);
  assert.equal(result.label, RELIABILITY_LABELS.CORRECTED);
});

test("origin-family metadata collapses outlets repeating the same source", () => {
  const result = assessReliability([
    { sourceKey: "ap", originFamily: "faa-release-42" },
    { sourceKey: "reuters", originFamily: "faa-release-42" },
  ]);
  assert.equal(result.supportFamilyCount, 1);
  assert.equal(result.label, RELIABILITY_LABELS.EARLY_REPORT);
});
