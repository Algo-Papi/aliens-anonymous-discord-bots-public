import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

function asJson(value) {
  return JSON.stringify(value ?? null);
}

function fromJson(value, fallback = null) {
  if (!value) {
    return fallback;
  }
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function timestampValue(value, fallback) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  const parsed = Date.parse(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function candidateItemId(candidate) {
  return candidate.versionId ?? candidate.id;
}

function mapSourceState(row) {
  if (!row) {
    return null;
  }
  return {
    sourceKey: row.sourceKey,
    initializedAt: row.initializedAt,
    lastAttemptAt: row.lastAttemptAt,
    lastSuccessAt: row.lastSuccessAt,
    lastItemAt: row.lastItemAt,
    consecutiveFailures: row.consecutiveFailures,
    circuitState: row.circuitState,
    nextAttemptAt: row.nextAttemptAt,
    etag: row.etag,
    lastModified: row.lastModified,
    lastError: row.lastError,
    incidentStartedAt: row.incidentStartedAt,
  };
}

function mapStory(row) {
  if (!row) {
    return null;
  }
  return {
    storyKey: row.storyKey,
    title: row.title,
    fingerprint: fromJson(row.fingerprintJson, []),
    reliability: row.reliability,
    sourceFamilies: fromJson(row.sourceFamiliesJson, []),
    evidence: fromJson(row.evidenceJson, []),
    discordChannelId: row.discordChannelId,
    discordMessageId: row.discordMessageId,
    discordThreadId: row.discordThreadId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    lastCandidateAt: row.lastCandidateAt,
  };
}

export class EarthIntelStore {
  constructor(databasePath) {
    mkdirSync(dirname(databasePath), { recursive: true });
    this.database = new Database(databasePath);
    this.database.pragma("journal_mode = WAL");
    this.database.pragma("foreign_keys = ON");
    this.database.pragma("busy_timeout = 5000");
    this.migrate();
    this.prepareStatements();
  }

  migrate() {
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS intel_sources (
        source_key TEXT PRIMARY KEY,
        initialized_at INTEGER,
        last_attempt_at INTEGER,
        last_success_at INTEGER,
        last_item_at INTEGER,
        consecutive_failures INTEGER NOT NULL DEFAULT 0,
        circuit_state TEXT NOT NULL DEFAULT 'closed',
        next_attempt_at INTEGER,
        etag TEXT,
        last_modified TEXT,
        last_error TEXT,
        incident_started_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS intel_candidates (
        source_key TEXT NOT NULL,
        item_id TEXT NOT NULL,
        story_key TEXT,
        source_family TEXT NOT NULL,
        published_at INTEGER NOT NULL,
        discovered_at INTEGER NOT NULL,
        status TEXT NOT NULL,
        suppression_reason TEXT,
        payload_json TEXT NOT NULL,
        discord_message_id TEXT,
        discord_thread_id TEXT,
        PRIMARY KEY (source_key, item_id)
      );

      CREATE INDEX IF NOT EXISTS intel_candidates_by_story
        ON intel_candidates (story_key, discovered_at DESC);
      CREATE INDEX IF NOT EXISTS intel_candidates_by_status
        ON intel_candidates (status, discovered_at DESC);

      CREATE TABLE IF NOT EXISTS intel_stories (
        story_key TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        fingerprint_json TEXT NOT NULL,
        reliability TEXT NOT NULL,
        source_families_json TEXT NOT NULL,
        evidence_json TEXT NOT NULL DEFAULT '[]',
        discord_channel_id TEXT NOT NULL,
        discord_message_id TEXT NOT NULL,
        discord_thread_id TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        last_candidate_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS intel_stories_recent
        ON intel_stories (last_candidate_at DESC);

      CREATE TABLE IF NOT EXISTS intel_outbox (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_key TEXT NOT NULL,
        item_id TEXT NOT NULL,
        story_key TEXT NOT NULL,
        action TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        state TEXT NOT NULL DEFAULT 'queued',
        attempts INTEGER NOT NULL DEFAULT 0,
        last_error TEXT,
        message_id TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        UNIQUE (source_key, item_id, action)
      );

      CREATE INDEX IF NOT EXISTS intel_outbox_pending
        ON intel_outbox (state, created_at);

      CREATE TABLE IF NOT EXISTS intel_incidents (
        incident_key TEXT PRIMARY KEY,
        severity TEXT NOT NULL,
        state TEXT NOT NULL,
        opened_at INTEGER NOT NULL,
        last_notified_at INTEGER,
        resolved_at INTEGER,
        details_json TEXT NOT NULL
      );
    `);
  }

  prepareStatements() {
    this.selectSource = this.database.prepare(`
      SELECT
        source_key AS sourceKey,
        initialized_at AS initializedAt,
        last_attempt_at AS lastAttemptAt,
        last_success_at AS lastSuccessAt,
        last_item_at AS lastItemAt,
        consecutive_failures AS consecutiveFailures,
        circuit_state AS circuitState,
        next_attempt_at AS nextAttemptAt,
        etag,
        last_modified AS lastModified,
        last_error AS lastError,
        incident_started_at AS incidentStartedAt
      FROM intel_sources
      WHERE source_key = ?
    `);
    this.upsertSourceSuccess = this.database.prepare(`
      INSERT INTO intel_sources (
        source_key,
        initialized_at,
        last_attempt_at,
        last_success_at,
        last_item_at,
        consecutive_failures,
        circuit_state,
        next_attempt_at,
        etag,
        last_modified,
        last_error,
        incident_started_at
      ) VALUES (
        @sourceKey,
        @initializedAt,
        @attemptedAt,
        @attemptedAt,
        @lastItemAt,
        0,
        'closed',
        NULL,
        @etag,
        @lastModified,
        NULL,
        NULL
      )
      ON CONFLICT (source_key) DO UPDATE SET
        initialized_at = COALESCE(intel_sources.initialized_at, excluded.initialized_at),
        last_attempt_at = excluded.last_attempt_at,
        last_success_at = excluded.last_success_at,
        last_item_at = COALESCE(excluded.last_item_at, intel_sources.last_item_at),
        consecutive_failures = 0,
        circuit_state = 'closed',
        next_attempt_at = NULL,
        etag = COALESCE(excluded.etag, intel_sources.etag),
        last_modified = COALESCE(excluded.last_modified, intel_sources.last_modified),
        last_error = NULL,
        incident_started_at = NULL
    `);
    this.upsertSourceFailure = this.database.prepare(`
      INSERT INTO intel_sources (
        source_key,
        last_attempt_at,
        consecutive_failures,
        circuit_state,
        next_attempt_at,
        last_error,
        incident_started_at
      ) VALUES (
        @sourceKey,
        @attemptedAt,
        1,
        @circuitState,
        @nextAttemptAt,
        @lastError,
        @attemptedAt
      )
      ON CONFLICT (source_key) DO UPDATE SET
        last_attempt_at = excluded.last_attempt_at,
        consecutive_failures = intel_sources.consecutive_failures + 1,
        circuit_state = excluded.circuit_state,
        next_attempt_at = excluded.next_attempt_at,
        last_error = excluded.last_error,
        incident_started_at = COALESCE(
          intel_sources.incident_started_at,
          excluded.incident_started_at
        )
    `);
    this.setSourceInitialized = this.database.prepare(`
      INSERT INTO intel_sources (source_key, initialized_at)
      VALUES (?, ?)
      ON CONFLICT (source_key) DO UPDATE SET
        initialized_at = COALESCE(intel_sources.initialized_at, excluded.initialized_at)
    `);
    this.selectCandidate = this.database.prepare(`
      SELECT 1
      FROM intel_candidates
      WHERE source_key = ? AND item_id = ?
    `);
    this.insertCandidate = this.database.prepare(`
      INSERT OR IGNORE INTO intel_candidates (
        source_key,
        item_id,
        story_key,
        source_family,
        published_at,
        discovered_at,
        status,
        suppression_reason,
        payload_json,
        discord_message_id,
        discord_thread_id
      ) VALUES (
        @sourceKey,
        @itemId,
        @storyKey,
        @sourceFamily,
        @publishedAt,
        @discoveredAt,
        @status,
        @suppressionReason,
        @payloadJson,
        @discordMessageId,
        @discordThreadId
      )
    `);
    this.updateCandidateDeliveryStatement = this.database.prepare(`
      UPDATE intel_candidates
      SET
        status = @status,
        discord_message_id = COALESCE(@discordMessageId, discord_message_id),
        discord_thread_id = COALESCE(@discordThreadId, discord_thread_id),
        suppression_reason = COALESCE(@suppressionReason, suppression_reason)
      WHERE source_key = @sourceKey AND item_id = @itemId
    `);
    this.selectStory = this.database.prepare(`
      SELECT
        story_key AS storyKey,
        title,
        fingerprint_json AS fingerprintJson,
        reliability,
        source_families_json AS sourceFamiliesJson,
        evidence_json AS evidenceJson,
        discord_channel_id AS discordChannelId,
        discord_message_id AS discordMessageId,
        discord_thread_id AS discordThreadId,
        created_at AS createdAt,
        updated_at AS updatedAt,
        last_candidate_at AS lastCandidateAt
      FROM intel_stories
      WHERE story_key = ?
    `);
    this.selectRecentStories = this.database.prepare(`
      SELECT
        story_key AS storyKey,
        title,
        fingerprint_json AS fingerprintJson,
        reliability,
        source_families_json AS sourceFamiliesJson,
        evidence_json AS evidenceJson,
        discord_channel_id AS discordChannelId,
        discord_message_id AS discordMessageId,
        discord_thread_id AS discordThreadId,
        created_at AS createdAt,
        updated_at AS updatedAt,
        last_candidate_at AS lastCandidateAt
      FROM intel_stories
      WHERE last_candidate_at >= ?
      ORDER BY last_candidate_at DESC
      LIMIT ?
    `);
    this.upsertStoryStatement = this.database.prepare(`
      INSERT INTO intel_stories (
        story_key,
        title,
        fingerprint_json,
        reliability,
        source_families_json,
        evidence_json,
        discord_channel_id,
        discord_message_id,
        discord_thread_id,
        created_at,
        updated_at,
        last_candidate_at
      ) VALUES (
        @storyKey,
        @title,
        @fingerprintJson,
        @reliability,
        @sourceFamiliesJson,
        @evidenceJson,
        @discordChannelId,
        @discordMessageId,
        @discordThreadId,
        @createdAt,
        @updatedAt,
        @lastCandidateAt
      )
      ON CONFLICT (story_key) DO UPDATE SET
        title = excluded.title,
        fingerprint_json = excluded.fingerprint_json,
        reliability = excluded.reliability,
        source_families_json = excluded.source_families_json,
        evidence_json = excluded.evidence_json,
        discord_thread_id = COALESCE(excluded.discord_thread_id, intel_stories.discord_thread_id),
        updated_at = excluded.updated_at,
        last_candidate_at = excluded.last_candidate_at
    `);
    this.insertOutbox = this.database.prepare(`
      INSERT OR IGNORE INTO intel_outbox (
        source_key,
        item_id,
        story_key,
        action,
        payload_json,
        state,
        created_at,
        updated_at
      ) VALUES (
        @sourceKey,
        @itemId,
        @storyKey,
        @action,
        @payloadJson,
        'queued',
        @createdAt,
        @createdAt
      )
    `);
    this.selectOutbox = this.database.prepare(`
      SELECT
        id,
        source_key AS sourceKey,
        item_id AS itemId,
        story_key AS storyKey,
        action,
        payload_json AS payloadJson,
        state,
        attempts,
        last_error AS lastError,
        message_id AS messageId,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM intel_outbox
      WHERE state IN ('queued', 'failed')
      ORDER BY created_at
      LIMIT ?
    `);
    this.setOutboxSending = this.database.prepare(`
      UPDATE intel_outbox
      SET state = 'sending', attempts = attempts + 1, updated_at = ?
      WHERE id = ? AND state IN ('queued', 'failed')
    `);
    this.setOutboxSent = this.database.prepare(`
      UPDATE intel_outbox
      SET
        state = 'sent',
        message_id = ?,
        last_error = NULL,
        updated_at = ?
      WHERE id = ?
    `);
    this.setOutboxFailed = this.database.prepare(`
      UPDATE intel_outbox
      SET state = 'failed', last_error = ?, updated_at = ?
      WHERE id = ?
    `);
    this.resetSendingOutbox = this.database.prepare(`
      UPDATE intel_outbox
      SET state = 'failed', last_error = 'Recovered after interrupted send', updated_at = ?
      WHERE state = 'sending'
    `);
    this.countPublishedSinceStatement = this.database.prepare(`
      SELECT COUNT(*) AS count
      FROM intel_outbox
      WHERE action = 'create' AND state = 'sent' AND updated_at >= ?
    `);
    this.selectIncident = this.database.prepare(`
      SELECT
        incident_key AS incidentKey,
        severity,
        state,
        opened_at AS openedAt,
        last_notified_at AS lastNotifiedAt,
        resolved_at AS resolvedAt,
        details_json AS detailsJson
      FROM intel_incidents
      WHERE incident_key = ?
    `);
    this.upsertIncident = this.database.prepare(`
      INSERT INTO intel_incidents (
        incident_key,
        severity,
        state,
        opened_at,
        last_notified_at,
        resolved_at,
        details_json
      ) VALUES (
        @incidentKey,
        @severity,
        'open',
        @openedAt,
        @lastNotifiedAt,
        NULL,
        @detailsJson
      )
      ON CONFLICT (incident_key) DO UPDATE SET
        severity = excluded.severity,
        state = 'open',
        last_notified_at = COALESCE(excluded.last_notified_at, intel_incidents.last_notified_at),
        resolved_at = NULL,
        details_json = excluded.details_json
    `);
    this.resolveIncidentStatement = this.database.prepare(`
      UPDATE intel_incidents
      SET state = 'resolved', resolved_at = ?, details_json = ?
      WHERE incident_key = ? AND state = 'open'
    `);
    this.selectOpenIncidents = this.database.prepare(`
      SELECT
        incident_key AS incidentKey,
        severity,
        state,
        opened_at AS openedAt,
        last_notified_at AS lastNotifiedAt,
        resolved_at AS resolvedAt,
        details_json AS detailsJson
      FROM intel_incidents
      WHERE state = 'open'
      ORDER BY opened_at
    `);
    this.selectAllSources = this.database.prepare(`
      SELECT
        source_key AS sourceKey,
        initialized_at AS initializedAt,
        last_attempt_at AS lastAttemptAt,
        last_success_at AS lastSuccessAt,
        last_item_at AS lastItemAt,
        consecutive_failures AS consecutiveFailures,
        circuit_state AS circuitState,
        next_attempt_at AS nextAttemptAt,
        etag,
        last_modified AS lastModified,
        last_error AS lastError,
        incident_started_at AS incidentStartedAt
      FROM intel_sources
      ORDER BY source_key
    `);

    this.seedSource = this.database.transaction((sourceKey, candidates, now) => {
      for (const candidate of candidates) {
        this.insertCandidate.run({
          sourceKey,
          itemId: candidateItemId(candidate),
          storyKey: null,
          sourceFamily:
            candidate.source?.family ?? candidate.source?.key ?? sourceKey,
          publishedAt: timestampValue(candidate.publishedAt, now),
          discoveredAt: now,
          status: "seeded",
          suppressionReason: "initial_history",
          payloadJson: asJson(candidate),
          discordMessageId: null,
          discordThreadId: null,
        });
      }
      this.setSourceInitialized.run(sourceKey, now);
    });
  }

  getSourceState(sourceKey) {
    return mapSourceState(this.selectSource.get(sourceKey));
  }

  isSourceInitialized(sourceKey) {
    return Boolean(this.getSourceState(sourceKey)?.initializedAt);
  }

  initializeSource(sourceKey, candidates, now = Date.now()) {
    this.seedSource(sourceKey, candidates, now);
  }

  markSourceSuccess({
    sourceKey,
    attemptedAt = Date.now(),
    lastItemAt = null,
    etag = null,
    lastModified = null,
  }) {
    const previous = this.getSourceState(sourceKey);
    this.upsertSourceSuccess.run({
      sourceKey,
      initializedAt: previous?.initializedAt ?? null,
      attemptedAt,
      lastItemAt,
      etag,
      lastModified,
    });
    return {
      previous,
      current: this.getSourceState(sourceKey),
    };
  }

  markSourceFailure({
    sourceKey,
    error,
    attemptedAt = Date.now(),
    circuitState = "open",
    nextAttemptAt = null,
  }) {
    this.upsertSourceFailure.run({
      sourceKey,
      attemptedAt,
      circuitState,
      nextAttemptAt,
      lastError: error instanceof Error ? error.message : String(error),
    });
    return this.getSourceState(sourceKey);
  }

  hasCandidate(sourceKey, itemId) {
    return Boolean(this.selectCandidate.get(sourceKey, itemId));
  }

  saveCandidate({
    candidate,
    storyKey = null,
    status,
    suppressionReason = null,
    discoveredAt = Date.now(),
  }) {
    const sourceKey = candidate.source?.key;
    const itemId = candidateItemId(candidate);
    if (!sourceKey || !itemId) {
      throw new Error("Intel candidates require source.key and id.");
    }
    return this.insertCandidate.run({
      sourceKey,
      itemId,
      storyKey,
      sourceFamily: candidate.source.family ?? sourceKey,
      publishedAt: timestampValue(candidate.publishedAt, discoveredAt),
      discoveredAt,
      status,
      suppressionReason,
      payloadJson: asJson(candidate),
      discordMessageId: null,
      discordThreadId: null,
    });
  }

  updateCandidateDelivery({
    sourceKey,
    itemId,
    status,
    discordMessageId = null,
    discordThreadId = null,
    suppressionReason = null,
  }) {
    this.updateCandidateDeliveryStatement.run({
      sourceKey,
      itemId,
      status,
      discordMessageId,
      discordThreadId,
      suppressionReason,
    });
  }

  getStory(storyKey) {
    return mapStory(this.selectStory.get(storyKey));
  }

  getRecentStories(since, limit = 100) {
    return this.selectRecentStories
      .all(since, limit)
      .map((row) => mapStory(row));
  }

  upsertStory(story) {
    const now = Date.now();
    this.upsertStoryStatement.run({
      storyKey: story.storyKey,
      title: story.title,
      fingerprintJson: asJson(story.fingerprint ?? []),
      reliability: story.reliability,
      sourceFamiliesJson: asJson([...new Set(story.sourceFamilies ?? [])]),
      evidenceJson: asJson(story.evidence ?? []),
      discordChannelId: story.discordChannelId,
      discordMessageId: story.discordMessageId,
      discordThreadId: story.discordThreadId ?? null,
      createdAt: story.createdAt ?? now,
      updatedAt: story.updatedAt ?? now,
      lastCandidateAt: story.lastCandidateAt ?? now,
    });
  }

  queueOutbox({
    sourceKey,
    itemId,
    storyKey,
    action,
    payload,
    createdAt = Date.now(),
  }) {
    const result = this.insertOutbox.run({
      sourceKey,
      itemId,
      storyKey,
      action,
      payloadJson: asJson(payload),
      createdAt,
    });
    return result.changes === 1;
  }

  getPendingOutbox(limit = 25) {
    return this.selectOutbox.all(limit).map((row) => ({
      ...row,
      payload: fromJson(row.payloadJson, {}),
    }));
  }

  markOutboxSending(id, now = Date.now()) {
    return this.setOutboxSending.run(now, id).changes === 1;
  }

  markOutboxSent(id, messageId, now = Date.now()) {
    this.setOutboxSent.run(messageId, now, id);
  }

  markOutboxFailed(id, error, now = Date.now()) {
    this.setOutboxFailed.run(
      error instanceof Error ? error.message : String(error),
      now,
      id,
    );
  }

  recoverInterruptedOutbox(now = Date.now()) {
    return this.resetSendingOutbox.run(now).changes;
  }

  countPublishedSince(since) {
    return this.countPublishedSinceStatement.get(since).count;
  }

  getIncident(incidentKey) {
    const row = this.selectIncident.get(incidentKey);
    return row
      ? {
          ...row,
          details: fromJson(row.detailsJson, {}),
        }
      : null;
  }

  openIncident({
    incidentKey,
    severity,
    details,
    openedAt = Date.now(),
    lastNotifiedAt = null,
  }) {
    this.upsertIncident.run({
      incidentKey,
      severity,
      openedAt,
      lastNotifiedAt,
      detailsJson: asJson(details),
    });
    return this.getIncident(incidentKey);
  }

  resolveIncident(incidentKey, details = {}, resolvedAt = Date.now()) {
    return (
      this.resolveIncidentStatement.run(
        resolvedAt,
        asJson(details),
        incidentKey,
      ).changes === 1
    );
  }

  getOpenIncidents() {
    return this.selectOpenIncidents.all().map((row) => ({
      ...row,
      details: fromJson(row.detailsJson, {}),
    }));
  }

  getHealthSnapshot() {
    return {
      sources: this.selectAllSources.all().map((row) => mapSourceState(row)),
      incidents: this.getOpenIncidents(),
    };
  }

  close() {
    this.database.close();
  }
}
