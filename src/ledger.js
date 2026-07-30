import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const REQUIRED_CITATION_FIELDS = Object.freeze([
  "guildId",
  "channelId",
  "sourceMessageId",
  "citationMessageId",
  "targetUserId",
  "targetUsername",
  "issuerUserId",
  "issuerUsername",
  "offenseId",
  "offenseLabel",
  "charge",
  "sentence",
  "createdAt",
]);

export class CitationLedger {
  constructor(databasePath) {
    mkdirSync(dirname(databasePath), { recursive: true });
    this.database = new Database(databasePath);
    this.database.pragma("journal_mode = WAL");
    this.database.pragma("foreign_keys = ON");
    this.migrate();
    this.prepareStatements();
  }

  migrate() {
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS citations (
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
        bureau_finding TEXT,
        created_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS citations_by_subject
        ON citations (guild_id, target_user_id, created_at DESC);
    `);

    const columns = this.database
      .prepare("PRAGMA table_info(citations)")
      .all()
      .map((column) => column.name);
    if (!columns.includes("bureau_finding")) {
      this.database.exec(
        "ALTER TABLE citations ADD COLUMN bureau_finding TEXT",
      );
    }
  }

  prepareStatements() {
    this.insertCitation = this.database.prepare(`
      INSERT INTO citations (
        guild_id,
        channel_id,
        source_message_id,
        citation_message_id,
        target_user_id,
        target_username,
        issuer_user_id,
        issuer_username,
        offense_id,
        offense_label,
        charge,
        sentence,
        bureau_finding,
        created_at
      ) VALUES (
        @guildId,
        @channelId,
        @sourceMessageId,
        @citationMessageId,
        @targetUserId,
        @targetUsername,
        @issuerUserId,
        @issuerUsername,
        @offenseId,
        @offenseLabel,
        @charge,
        @sentence,
        @finding,
        @createdAt
      )
    `);

    this.countBySubject = this.database.prepare(`
      SELECT COUNT(*) AS total
      FROM citations
      WHERE guild_id = ? AND target_user_id = ?
    `);

    this.listBySubject = this.database.prepare(`
      SELECT
        id,
        guild_id AS guildId,
        channel_id AS channelId,
        source_message_id AS sourceMessageId,
        citation_message_id AS citationMessageId,
        target_user_id AS targetUserId,
        target_username AS targetUsername,
        issuer_user_id AS issuerUserId,
        issuer_username AS issuerUsername,
        offense_id AS offenseId,
        offense_label AS offenseLabel,
        charge,
        sentence,
        bureau_finding AS finding,
        created_at AS createdAt
      FROM citations
      WHERE guild_id = ? AND target_user_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `);
  }

  add(citation) {
    for (const field of REQUIRED_CITATION_FIELDS) {
      if (
        citation[field] === undefined ||
        citation[field] === null ||
        citation[field] === ""
      ) {
        throw new Error(`Citation field is required: ${field}`);
      }
    }

    const result = this.insertCitation.run({
      ...citation,
      finding: citation.finding ?? null,
    });
    return Number(result.lastInsertRowid);
  }

  getRecord(guildId, targetUserId, limit = 8) {
    const safeLimit = Math.max(1, Math.min(20, Number.parseInt(limit, 10) || 8));
    const { total } = this.countBySubject.get(guildId, targetUserId);
    const citations = this.listBySubject.all(
      guildId,
      targetUserId,
      safeLimit,
    );
    return { total, citations };
  }

  close() {
    this.database.close();
  }
}

export function citationMessageUrl(citation) {
  return `https://discord.com/channels/${citation.guildId}/${citation.channelId}/${citation.sourceMessageId}`;
}
