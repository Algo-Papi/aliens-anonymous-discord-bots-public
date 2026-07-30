import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

import Database from "better-sqlite3";

const MIGRATIONS = [
  {
    version: 1,
    sql: `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS agent_j_users (
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        credits INTEGER NOT NULL DEFAULT 20,
        reputation INTEGER NOT NULL DEFAULT 0,
        wins INTEGER NOT NULL DEFAULT 0,
        losses INTEGER NOT NULL DEFAULT 0,
        current_streak INTEGER NOT NULL DEFAULT 0,
        best_streak INTEGER NOT NULL DEFAULT 0,
        selected_title TEXT,
        target_opt_out INTEGER NOT NULL DEFAULT 0,
        witness_opt_out INTEGER NOT NULL DEFAULT 0,
        daily_earned INTEGER NOT NULL DEFAULT 0,
        daily_earned_date TEXT,
        arena_locked_until TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (guild_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS arena_matches (
        id TEXT PRIMARY KEY,
        guild_id TEXT NOT NULL,
        channel_id TEXT NOT NULL,
        message_id TEXT,
        challenger_id TEXT NOT NULL,
        opponent_id TEXT NOT NULL,
        pair_key TEXT NOT NULL,
        status TEXT NOT NULL CHECK (
          status IN (
            'pending',
            'equipment_select',
            'round_select',
            'complete',
            'declined',
            'expired',
            'abandoned',
            'technical_cancel'
          )
        ),
        ranked INTEGER NOT NULL DEFAULT 0,
        current_round INTEGER NOT NULL DEFAULT 0,
        challenger_round_wins INTEGER NOT NULL DEFAULT 0,
        opponent_round_wins INTEGER NOT NULL DEFAULT 0,
        challenger_gadget_id TEXT,
        opponent_gadget_id TEXT,
        challenger_gadget_reserved INTEGER NOT NULL DEFAULT 0,
        opponent_gadget_reserved INTEGER NOT NULL DEFAULT 0,
        winner_id TEXT,
        abandoned_by_user_id TEXT,
        challenger_reward INTEGER NOT NULL DEFAULT 0,
        opponent_reward INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        accepted_at TEXT,
        last_transition_at TEXT NOT NULL,
        resolved_at TEXT,
        expires_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS arena_matches_active_lookup
        ON arena_matches (guild_id, status, challenger_id, opponent_id);
      CREATE INDEX IF NOT EXISTS arena_matches_pair_lookup
        ON arena_matches (guild_id, pair_key, created_at);
      CREATE INDEX IF NOT EXISTS arena_matches_message_lookup
        ON arena_matches (guild_id, channel_id, message_id);

      CREATE TABLE IF NOT EXISTS arena_tactic_choices (
        match_id TEXT NOT NULL REFERENCES arena_matches(id) ON DELETE CASCADE,
        round_number INTEGER NOT NULL,
        user_id TEXT NOT NULL,
        tactic TEXT NOT NULL CHECK (tactic IN ('blast', 'shield', 'dirty_trick')),
        selected_at TEXT NOT NULL,
        PRIMARY KEY (match_id, round_number, user_id)
      );

      CREATE TABLE IF NOT EXISTS arena_rounds (
        match_id TEXT NOT NULL REFERENCES arena_matches(id) ON DELETE CASCADE,
        round_number INTEGER NOT NULL,
        challenger_tactic TEXT NOT NULL,
        opponent_tactic TEXT NOT NULL,
        challenger_initial_roll INTEGER NOT NULL,
        opponent_initial_roll INTEGER NOT NULL,
        challenger_final_raw_roll INTEGER NOT NULL,
        opponent_final_raw_roll INTEGER NOT NULL,
        challenger_tactic_bonus INTEGER NOT NULL,
        opponent_tactic_bonus INTEGER NOT NULL,
        challenger_gadget_effect TEXT,
        opponent_gadget_effect TEXT,
        challenger_gadget_modifier INTEGER NOT NULL DEFAULT 0,
        opponent_gadget_modifier INTEGER NOT NULL DEFAULT 0,
        tie_rolls_json TEXT,
        challenger_total INTEGER NOT NULL,
        opponent_total INTEGER NOT NULL,
        winner_id TEXT NOT NULL,
        narration_id TEXT NOT NULL,
        resolved_at TEXT NOT NULL,
        PRIMARY KEY (match_id, round_number)
      );

      CREATE TABLE IF NOT EXISTS arena_inventory (
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        gadget_id TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0 CHECK (
          quantity >= 0 AND quantity <= 20
        ),
        PRIMARY KEY (guild_id, user_id, gadget_id)
      );

      CREATE TABLE IF NOT EXISTS economy_ledger (
        id TEXT PRIMARY KEY,
        idempotency_key TEXT NOT NULL UNIQUE,
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        amount INTEGER NOT NULL,
        balance_after INTEGER NOT NULL,
        reason TEXT NOT NULL,
        reference_id TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS arena_abandonments (
        match_id TEXT NOT NULL,
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        occurred_at TEXT NOT NULL,
        PRIMARY KEY (match_id, user_id)
      );

      CREATE INDEX IF NOT EXISTS arena_abandonment_user_lookup
        ON arena_abandonments (guild_id, user_id, occurred_at);
    `,
  },
  {
    version: 2,
    sql: `
      ALTER TABLE agent_j_users
        ADD COLUMN selected_case_theme_id TEXT;
      ALTER TABLE agent_j_users
        ADD COLUMN selected_victory_stamp_id TEXT;
      ALTER TABLE agent_j_users
        ADD COLUMN selected_broadcast_pack_id TEXT;
      ALTER TABLE agent_j_users
        ADD COLUMN artifact_wins INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE agent_j_users
        ADD COLUMN artifact_losses INTEGER NOT NULL DEFAULT 0;

      ALTER TABLE arena_matches
        ADD COLUMN match_mode TEXT NOT NULL DEFAULT 'standard';
      ALTER TABLE arena_matches
        ADD COLUMN artifact_id TEXT;
      ALTER TABLE arena_matches
        ADD COLUMN artifact_activation_fee INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE arena_matches
        ADD COLUMN artifact_activation_refunded INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE arena_matches
        ADD COLUMN challenger_equipment_locked INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE arena_matches
        ADD COLUMN opponent_equipment_locked INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE arena_matches
        ADD COLUMN case_theme_id TEXT;
      ALTER TABLE arena_matches
        ADD COLUMN broadcast_pack_id TEXT;
      ALTER TABLE arena_matches
        ADD COLUMN victory_stamp_id TEXT;
      ALTER TABLE arena_matches
        ADD COLUMN progression_awarded INTEGER NOT NULL DEFAULT 0;

      CREATE TABLE IF NOT EXISTS arena_owned_items (
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        item_id TEXT NOT NULL,
        purchased_at TEXT NOT NULL,
        purchase_price INTEGER NOT NULL,
        PRIMARY KEY (guild_id, user_id, item_id)
      );

      CREATE TABLE IF NOT EXISTS arena_artifact_cooldowns (
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        artifact_id TEXT NOT NULL,
        last_activated_at TEXT NOT NULL,
        PRIMARY KEY (guild_id, user_id, artifact_id)
      );

      INSERT OR IGNORE INTO economy_ledger (
        id,
        idempotency_key,
        guild_id,
        user_id,
        amount,
        balance_after,
        reason,
        reference_id,
        created_at
      )
      SELECT
        'opening:' || guild_id || ':' || user_id,
        'opening:' || guild_id || ':' || user_id,
        guild_id,
        user_id,
        20,
        20,
        'opening_balance',
        NULL,
        created_at
      FROM agent_j_users;
    `,
  },
  {
    version: 3,
    sql: `
      ALTER TABLE arena_matches
        ADD COLUMN control_message_id TEXT;
      ALTER TABLE arena_matches
        ADD COLUMN control_round INTEGER;

      CREATE INDEX IF NOT EXISTS arena_matches_control_message_lookup
        ON arena_matches (guild_id, channel_id, control_message_id);
    `,
  },
  {
    version: 4,
    sql: `
      ALTER TABLE agent_j_users
        ADD COLUMN ai_context_opt_out INTEGER NOT NULL DEFAULT 0;
    `,
  },
  {
    version: 5,
    sql: `
      ALTER TABLE arena_matches
        ADD COLUMN archive_message_id TEXT;

      CREATE TABLE IF NOT EXISTS arena_message_cleanup (
        message_id TEXT PRIMARY KEY,
        match_id TEXT NOT NULL REFERENCES arena_matches(id) ON DELETE CASCADE,
        guild_id TEXT NOT NULL,
        channel_id TEXT NOT NULL,
        delete_after TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS arena_message_cleanup_due
        ON arena_message_cleanup (delete_after);
      CREATE INDEX IF NOT EXISTS arena_matches_archive_backfill
        ON arena_matches (status, archive_message_id, resolved_at);
    `,
  },
];

function applyMigrations(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    )
  `);

  const applied = new Set(
    database
      .prepare("SELECT version FROM schema_migrations")
      .all()
      .map((row) => row.version),
  );
  const recordMigration = database.prepare(
    "INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)",
  );

  for (const migration of MIGRATIONS) {
    if (applied.has(migration.version)) {
      continue;
    }
    database.transaction(() => {
      database.exec(migration.sql);
      recordMigration.run(migration.version, new Date().toISOString());
    })();
  }
}

export function openDatabase(databasePath) {
  mkdirSync(dirname(databasePath), { recursive: true });
  const database = new Database(databasePath);
  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");
  database.pragma("busy_timeout = 5000");
  applyMigrations(database);
  return database;
}

export function getSchemaVersion(database) {
  return (
    database
      .prepare("SELECT MAX(version) AS version FROM schema_migrations")
      .get()?.version ?? 0
  );
}
