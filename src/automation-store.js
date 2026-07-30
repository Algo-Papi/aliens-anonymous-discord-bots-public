import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export class AutomationStore {
  constructor(databasePath) {
    mkdirSync(dirname(databasePath), { recursive: true });
    this.database = new Database(databasePath);
    this.database.pragma("journal_mode = WAL");
    this.migrate();
    this.prepareStatements();
  }

  migrate() {
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS feed_sources (
        source_key TEXT PRIMARY KEY,
        initialized_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS feed_items (
        source_key TEXT NOT NULL,
        item_id TEXT NOT NULL,
        published_at INTEGER NOT NULL,
        seen_at INTEGER NOT NULL,
        PRIMARY KEY (source_key, item_id)
      );

      CREATE INDEX IF NOT EXISTS feed_items_by_source
        ON feed_items (source_key, published_at DESC);

      CREATE TABLE IF NOT EXISTS archive_entries (
        guild_id TEXT NOT NULL,
        source_channel_id TEXT NOT NULL,
        source_message_id TEXT NOT NULL,
        archive_channel_id TEXT NOT NULL,
        archive_message_id TEXT NOT NULL UNIQUE,
        star_count INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (guild_id, source_message_id)
      );

      CREATE TABLE IF NOT EXISTS bump_reminder_slots (
        slot_key TEXT PRIMARY KEY,
        channel_id TEXT NOT NULL,
        status TEXT NOT NULL,
        claimed_at INTEGER NOT NULL,
        completed_at INTEGER,
        message_id TEXT,
        note TEXT
      );

      CREATE TABLE IF NOT EXISTS disboard_bumps (
        message_id TEXT PRIMARY KEY,
        channel_id TEXT NOT NULL,
        bumped_at INTEGER NOT NULL,
        recorded_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS disboard_bumps_by_time
        ON disboard_bumps (bumped_at DESC);
    `);
  }

  prepareStatements() {
    this.selectFeedSource = this.database.prepare(`
      SELECT source_key AS sourceKey, initialized_at AS initializedAt
      FROM feed_sources
      WHERE source_key = ?
    `);
    this.insertFeedSource = this.database.prepare(`
      INSERT OR IGNORE INTO feed_sources (source_key, initialized_at)
      VALUES (?, ?)
    `);
    this.selectFeedItem = this.database.prepare(`
      SELECT 1
      FROM feed_items
      WHERE source_key = ? AND item_id = ?
    `);
    this.insertFeedItem = this.database.prepare(`
      INSERT OR IGNORE INTO feed_items (
        source_key,
        item_id,
        published_at,
        seen_at
      ) VALUES (?, ?, ?, ?)
    `);
    this.selectArchiveEntry = this.database.prepare(`
      SELECT
        guild_id AS guildId,
        source_channel_id AS sourceChannelId,
        source_message_id AS sourceMessageId,
        archive_channel_id AS archiveChannelId,
        archive_message_id AS archiveMessageId,
        star_count AS starCount,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM archive_entries
      WHERE guild_id = ? AND source_message_id = ?
    `);
    this.upsertArchiveEntry = this.database.prepare(`
      INSERT INTO archive_entries (
        guild_id,
        source_channel_id,
        source_message_id,
        archive_channel_id,
        archive_message_id,
        star_count,
        created_at,
        updated_at
      ) VALUES (
        @guildId,
        @sourceChannelId,
        @sourceMessageId,
        @archiveChannelId,
        @archiveMessageId,
        @starCount,
        @createdAt,
        @updatedAt
      )
      ON CONFLICT (guild_id, source_message_id) DO UPDATE SET
        archive_channel_id = excluded.archive_channel_id,
        archive_message_id = excluded.archive_message_id,
        star_count = excluded.star_count,
        updated_at = excluded.updated_at
    `);
    this.updateArchiveCount = this.database.prepare(`
      UPDATE archive_entries
      SET star_count = ?, updated_at = ?
      WHERE guild_id = ? AND source_message_id = ?
    `);
    this.insertBumpReminderClaim = this.database.prepare(`
      INSERT OR IGNORE INTO bump_reminder_slots (
        slot_key,
        channel_id,
        status,
        claimed_at
      ) VALUES (?, ?, 'claimed', ?)
    `);
    this.completeBumpReminderStatement = this.database.prepare(`
      UPDATE bump_reminder_slots
      SET status = ?, completed_at = ?, message_id = ?, note = ?
      WHERE slot_key = ?
    `);
    this.selectBumpReminder = this.database.prepare(`
      SELECT
        slot_key AS slotKey,
        channel_id AS channelId,
        status,
        claimed_at AS claimedAt,
        completed_at AS completedAt,
        message_id AS messageId,
        note
      FROM bump_reminder_slots
      WHERE slot_key = ?
    `);
    this.insertDisboardBump = this.database.prepare(`
      INSERT OR IGNORE INTO disboard_bumps (
        message_id,
        channel_id,
        bumped_at,
        recorded_at
      ) VALUES (?, ?, ?, ?)
    `);
    this.selectLatestDisboardBump = this.database.prepare(`
      SELECT
        message_id AS messageId,
        channel_id AS channelId,
        bumped_at AS bumpedAt,
        recorded_at AS recordedAt
      FROM disboard_bumps
      ORDER BY bumped_at DESC
      LIMIT 1
    `);
    this.seedFeed = this.database.transaction((sourceKey, items, now) => {
      for (const item of items) {
        this.insertFeedItem.run(
          sourceKey,
          item.id,
          item.publishedAt,
          now,
        );
      }
      this.insertFeedSource.run(sourceKey, now);
    });
  }

  isFeedInitialized(sourceKey) {
    return Boolean(this.selectFeedSource.get(sourceKey));
  }

  initializeFeed(sourceKey, items, now = Date.now()) {
    this.seedFeed(sourceKey, items, now);
  }

  hasFeedItem(sourceKey, itemId) {
    return Boolean(this.selectFeedItem.get(sourceKey, itemId));
  }

  rememberFeedItem(sourceKey, item, now = Date.now()) {
    this.insertFeedItem.run(
      sourceKey,
      item.id,
      item.publishedAt,
      now,
    );
  }

  getArchiveEntry(guildId, sourceMessageId) {
    return (
      this.selectArchiveEntry.get(guildId, sourceMessageId) ?? null
    );
  }

  saveArchiveEntry(entry) {
    this.upsertArchiveEntry.run(entry);
  }

  setArchiveStarCount(
    guildId,
    sourceMessageId,
    starCount,
    updatedAt = Date.now(),
  ) {
    this.updateArchiveCount.run(
      starCount,
      updatedAt,
      guildId,
      sourceMessageId,
    );
  }

  claimBumpReminder(slotKey, channelId, claimedAt = Date.now()) {
    return (
      this.insertBumpReminderClaim.run(
        slotKey,
        channelId,
        claimedAt,
      ).changes === 1
    );
  }

  completeBumpReminder(
    slotKey,
    { status, messageId = null, note = null },
    completedAt = Date.now(),
  ) {
    this.completeBumpReminderStatement.run(
      status,
      completedAt,
      messageId,
      note,
      slotKey,
    );
  }

  getBumpReminder(slotKey) {
    return this.selectBumpReminder.get(slotKey) ?? null;
  }

  rememberDisboardBump(
    { messageId, channelId, bumpedAt },
    recordedAt = Date.now(),
  ) {
    return (
      this.insertDisboardBump.run(
        messageId,
        channelId,
        bumpedAt,
        recordedAt,
      ).changes === 1
    );
  }

  getLatestDisboardBump() {
    return this.selectLatestDisboardBump.get() ?? null;
  }

  close() {
    this.database.close();
  }
}
