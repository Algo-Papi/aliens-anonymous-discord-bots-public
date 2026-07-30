function iso(nowMs) {
  return new Date(nowMs).toISOString();
}

export class UserStore {
  constructor(database, { now = Date.now } = {}) {
    this.database = database;
    this.now = now;
    this.ensureStatement = database.prepare(`
      INSERT INTO agent_j_users (
        guild_id,
        user_id,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?)
      ON CONFLICT (guild_id, user_id) DO NOTHING
    `);
    this.getStatement = database.prepare(`
      SELECT *
      FROM agent_j_users
      WHERE guild_id = ? AND user_id = ?
    `);
    this.setPrivacyStatement = database.prepare(`
      UPDATE agent_j_users
      SET
        target_opt_out = @targetOptOut,
        witness_opt_out = @witnessOptOut,
        ai_context_opt_out = @aiContextOptOut,
        updated_at = @updatedAt
      WHERE guild_id = @guildId AND user_id = @userId
    `);
  }

  ensure(guildId, userId, nowMs = this.now()) {
    const timestamp = iso(nowMs);
    return this.database.transaction(() => {
      const inserted = this.ensureStatement.run(
        guildId,
        userId,
        timestamp,
        timestamp,
      );
      if (inserted.changes === 1) {
        this.database
          .prepare(`
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
            ) VALUES (?, ?, ?, ?, 20, 20, 'opening_balance', NULL, ?)
          `)
          .run(
            `opening:${guildId}:${userId}`,
            `opening:${guildId}:${userId}`,
            guildId,
            userId,
            timestamp,
          );
      }
      return this.getStatement.get(guildId, userId);
    })();
  }

  get(guildId, userId) {
    return this.getStatement.get(guildId, userId) ?? null;
  }

  getPrivacy(guildId, userId) {
    const user = this.ensure(guildId, userId);
    return {
      targetOptOut: Boolean(user.target_opt_out),
      witnessOptOut: Boolean(user.witness_opt_out),
      aiContextOptOut: Boolean(user.ai_context_opt_out),
    };
  }

  peekPrivacy(guildId, userId) {
    const user = this.get(guildId, userId);
    return {
      targetOptOut: Boolean(user?.target_opt_out),
      witnessOptOut: Boolean(user?.witness_opt_out),
      aiContextOptOut: Boolean(user?.ai_context_opt_out),
    };
  }

  setPrivacy(
    guildId,
    userId,
    { targetOptOut, witnessOptOut, aiContextOptOut },
    nowMs = this.now(),
  ) {
    const current = this.getPrivacy(guildId, userId);
    const next = {
      targetOptOut:
        targetOptOut == null ? current.targetOptOut : Boolean(targetOptOut),
      witnessOptOut:
        witnessOptOut == null ? current.witnessOptOut : Boolean(witnessOptOut),
      aiContextOptOut:
        aiContextOptOut == null
          ? current.aiContextOptOut
          : Boolean(aiContextOptOut),
    };
    this.setPrivacyStatement.run({
      guildId,
      userId,
      targetOptOut: Number(next.targetOptOut),
      witnessOptOut: Number(next.witnessOptOut),
      aiContextOptOut: Number(next.aiContextOptOut),
      updatedAt: iso(nowMs),
    });
    return next;
  }
}
