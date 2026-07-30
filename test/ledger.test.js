import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { CitationLedger, citationMessageUrl } from "../src/ledger.js";

const citation = {
  guildId: "100000000000000000",
  channelId: "100000000000000001",
  sourceMessageId: "100000000000000002",
  citationMessageId: "100000000000000003",
  targetUserId: "100000000000000005",
  targetUsername: "example_target",
  issuerUserId: "100000000000000006",
  issuerUsername: "example_issuer",
  offenseId: "low_altitude",
  offenseLabel: "Low-Altitude Hostility",
  charge: "Trafficking in low-hanging fruit",
  sentence: "One mandatory booster-seat inspection",
  finding: "Witnesses report the point passed directly overhead.",
  createdAt: 1_785_256_000_000,
};

test("persists and retrieves a subject's citation history", () => {
  const directory = mkdtempSync(join(tmpdir(), "aa-citation-ledger-"));
  const databasePath = join(directory, "citations.sqlite");
  const ledger = new CitationLedger(databasePath);

  try {
    const firstId = ledger.add(citation);
    const secondId = ledger.add({
      ...citation,
      citationMessageId: "100000000000000004",
      sourceMessageId: "100000000000000007",
      charge: "Aggravated altitude commentary",
      createdAt: citation.createdAt + 1_000,
    });
    const record = ledger.getRecord(citation.guildId, citation.targetUserId);

    assert.equal(firstId, 1);
    assert.equal(secondId, 2);
    assert.equal(record.total, 2);
    assert.equal(record.citations[0].charge, "Aggravated altitude commentary");
    assert.equal(record.citations[1].charge, citation.charge);
    assert.equal(record.citations[1].finding, citation.finding);
  } finally {
    ledger.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("migrates an existing citation ledger to preserve optional Bureau findings", () => {
  const directory = mkdtempSync(join(tmpdir(), "aa-citation-ledger-"));
  const databasePath = join(directory, "citations.sqlite");
  const legacy = new Database(databasePath);
  legacy.exec(`
    CREATE TABLE citations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      source_message_id TEXT NOT NULL,
      citation_message_id TEXT NOT NULL UNIQUE,
      target_user_id TEXT NOT NULL,
      target_username TEXT NOT NULL,
      issuer_user_id TEXT NOT NULL,
      issuer_username TEXT NOT NULL,
      offense_id TEXT NOT NULL,
      offense_label TEXT NOT NULL,
      charge TEXT NOT NULL,
      sentence TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);
  legacy.close();

  const ledger = new CitationLedger(databasePath);
  try {
    ledger.add(citation);
    const record = ledger.getRecord(citation.guildId, citation.targetUserId);

    assert.equal(record.total, 1);
    assert.equal(record.citations[0].finding, citation.finding);
  } finally {
    ledger.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("record queries are scoped to guild and subject", () => {
  const directory = mkdtempSync(join(tmpdir(), "aa-citation-ledger-"));
  const ledger = new CitationLedger(join(directory, "citations.sqlite"));

  try {
    ledger.add(citation);
    assert.equal(ledger.getRecord("999999999999999999", citation.targetUserId).total, 0);
    assert.equal(ledger.getRecord(citation.guildId, "888888888888888888").total, 0);
  } finally {
    ledger.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("builds a jump link to the associated message", () => {
  assert.equal(
    citationMessageUrl(citation),
    "https://discord.com/channels/100000000000000000/100000000000000001/100000000000000002",
  );
});
