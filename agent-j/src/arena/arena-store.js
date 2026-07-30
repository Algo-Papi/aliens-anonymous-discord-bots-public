import { randomInt, randomUUID } from "node:crypto";

import { getItem, isArtifact, isGadget } from "../economy/catalog.js";
import { isTactic, resolveRound } from "./rules.js";

const ACTIVE_STATUSES = Object.freeze([
  "pending",
  "equipment_select",
  "round_select",
]);

const CHALLENGER_COOLDOWN_MS = 90_000;
const PAIR_COOLDOWN_MS = 10 * 60_000;
const CHALLENGE_TIMEOUT_MS = 60_000;
const EQUIPMENT_TIMEOUT_MS = 20_000;
const ROUND_TIMEOUT_MS = 35_000;
const ARTIFACT_COOLDOWN_MS = 7 * 24 * 60 * 60_000;
const ABANDONMENT_COOLDOWN_MS = 5 * 60_000;
const ABANDONMENT_LOCKOUT_MS = 60 * 60_000;
const ABANDONMENT_WINDOW_MS = 24 * 60 * 60_000;

function iso(nowMs) {
  return new Date(nowMs).toISOString();
}

function pairKey(firstUserId, secondUserId) {
  return [firstUserId, secondUserId].sort().join(":");
}

function arenaError(code, message, details = {}) {
  return Object.assign(new Error(message), { code, ...details });
}

export class ArenaStore {
  constructor(
    database,
    { now = Date.now, randomIntFn = randomInt, idFactory = randomUUID } = {},
  ) {
    this.database = database;
    this.now = now;
    this.randomInt = randomIntFn;
    this.idFactory = idFactory;
  }

  getMatch(matchId) {
    return (
      this.database
        .prepare("SELECT * FROM arena_matches WHERE id = ?")
        .get(matchId) ?? null
    );
  }

  getRounds(matchId) {
    return this.database
      .prepare(`
        SELECT *
        FROM arena_rounds
        WHERE match_id = ?
        ORDER BY round_number
      `)
      .all(matchId);
  }

  getActiveMatchByMessage(guildId, channelId, messageId) {
    return (
      this.database
        .prepare(`
          SELECT *
          FROM arena_matches
          WHERE
            guild_id = ?
            AND channel_id = ?
            AND (message_id = ? OR control_message_id = ?)
            AND status IN ('pending', 'equipment_select', 'round_select')
        `)
        .get(guildId, channelId, messageId, messageId) ?? null
    );
  }

  createChallenge({
    guildId,
    channelId,
    challengerId,
    opponentId,
    mode = "standard",
    artifactId = null,
    nowMs = this.now(),
  }) {
    if (challengerId === opponentId) {
      throw arenaError("SELF_CHALLENGE", "You cannot challenge yourself.");
    }
    if (!["standard", "blacksite"].includes(mode)) {
      throw arenaError("INVALID_MODE", "That Arena mode is not authorized.");
    }
    if (mode === "blacksite" && !isArtifact(artifactId)) {
      throw arenaError(
        "INVALID_ARTIFACT",
        "A Full Blacksite challenge requires a valid Artifact.",
      );
    }
    if (mode === "standard" && artifactId) {
      throw arenaError(
        "INVALID_ARTIFACT",
        "Artifacts cannot be attached to standard Arena challenges.",
      );
    }

    return this.database.transaction(() => {
      const timestamp = iso(nowMs);
      const participants = [challengerId, opponentId];
      for (const userId of participants) {
        const inserted = this.database
          .prepare(`
            INSERT INTO agent_j_users (
              guild_id,
              user_id,
              created_at,
              updated_at
            ) VALUES (?, ?, ?, ?)
            ON CONFLICT (guild_id, user_id) DO NOTHING
          `)
          .run(guildId, userId, timestamp, timestamp);
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
      }

      if (mode === "blacksite") {
        const owned = this.database
          .prepare(`
            SELECT 1
            FROM arena_owned_items
            WHERE guild_id = ? AND user_id = ? AND item_id = ?
          `)
          .get(guildId, challengerId, artifactId);
        if (!owned) {
          throw arenaError(
            "ARTIFACT_NOT_OWNED",
            "You do not own that Black Vault Artifact.",
          );
        }
        const lastActivation = this.database
          .prepare(`
            SELECT last_activated_at
            FROM arena_artifact_cooldowns
            WHERE guild_id = ? AND user_id = ? AND artifact_id = ?
          `)
          .get(guildId, challengerId, artifactId);
        if (lastActivation) {
          const availableAt =
            new Date(lastActivation.last_activated_at).getTime() +
            ARTIFACT_COOLDOWN_MS;
          if (availableAt > nowMs) {
            throw arenaError(
              "ARTIFACT_COOLDOWN",
              "That Artifact is still under Black Vault lockdown.",
              { until: iso(availableAt) },
            );
          }
        }
      }

      const lock = this.database
        .prepare(`
          SELECT user_id, arena_locked_until
          FROM agent_j_users
          WHERE
            guild_id = ?
            AND user_id IN (?, ?)
            AND arena_locked_until IS NOT NULL
            AND arena_locked_until > ?
          LIMIT 1
        `)
        .get(guildId, challengerId, opponentId, timestamp);
      if (lock) {
        throw arenaError(
          "ARENA_LOCKED",
          "One of these players is temporarily locked out of the Arena.",
          { lockedUserId: lock.user_id, until: lock.arena_locked_until },
        );
      }

      const active = this.database
        .prepare(`
          SELECT id
          FROM arena_matches
          WHERE
            guild_id = ?
            AND status IN ('pending', 'equipment_select', 'round_select')
            AND (
              challenger_id IN (?, ?)
              OR opponent_id IN (?, ?)
            )
          LIMIT 1
        `)
        .get(
          guildId,
          challengerId,
          opponentId,
          challengerId,
          opponentId,
        );
      if (active) {
        throw arenaError(
          "PLAYER_BUSY",
          "One of these players already has a pending or active Arena match.",
        );
      }

      const challengerCutoff = iso(nowMs - CHALLENGER_COOLDOWN_MS);
      const recentChallenge = this.database
        .prepare(`
          SELECT created_at
          FROM arena_matches
          WHERE
            guild_id = ?
            AND challenger_id = ?
            AND message_id IS NOT NULL
            AND created_at > ?
          ORDER BY created_at DESC
          LIMIT 1
        `)
        .get(guildId, challengerId, challengerCutoff);
      if (recentChallenge) {
        throw arenaError(
          "CHALLENGER_COOLDOWN",
          "You need to let the smoke clear before issuing another challenge.",
          {
            until: iso(
              new Date(recentChallenge.created_at).getTime() +
                CHALLENGER_COOLDOWN_MS,
            ),
          },
        );
      }

      const key = pairKey(challengerId, opponentId);
      const pairCutoff = iso(nowMs - PAIR_COOLDOWN_MS);
      const recentPair = this.database
        .prepare(`
          SELECT created_at
          FROM arena_matches
          WHERE
            guild_id = ?
            AND pair_key = ?
            AND message_id IS NOT NULL
            AND created_at > ?
          ORDER BY created_at DESC
          LIMIT 1
        `)
        .get(guildId, key, pairCutoff);
      if (recentPair) {
        throw arenaError(
          "PAIR_COOLDOWN",
          "That matchup is still under Bureau review.",
          {
            until: iso(
              new Date(recentPair.created_at).getTime() + PAIR_COOLDOWN_MS,
            ),
          },
        );
      }

      const challengerProfile = this.database
        .prepare(`
          SELECT
            selected_case_theme_id,
            selected_broadcast_pack_id
          FROM agent_j_users
          WHERE guild_id = ? AND user_id = ?
        `)
        .get(guildId, challengerId);
      const eligiblePairMatches = this.database
        .prepare(`
          SELECT COUNT(*) AS count
          FROM arena_matches
          WHERE
            guild_id = ?
            AND pair_key = ?
            AND match_mode = 'standard'
            AND ranked = 1
            AND status = 'complete'
            AND resolved_at >= ?
        `)
        .get(guildId, key, iso(nowMs - 24 * 60 * 60_000)).count;
      const ranked = mode === "standard" && eligiblePairMatches < 2;

      const id = this.idFactory();
      this.database
        .prepare(`
          INSERT INTO arena_matches (
            id,
            guild_id,
            channel_id,
            challenger_id,
            opponent_id,
            pair_key,
            status,
            ranked,
            match_mode,
            artifact_id,
            case_theme_id,
            broadcast_pack_id,
            created_at,
            last_transition_at,
            expires_at
          ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .run(
          id,
          guildId,
          channelId,
          challengerId,
          opponentId,
          key,
          Number(ranked),
          mode,
          artifactId,
          challengerProfile?.selected_case_theme_id ?? null,
          challengerProfile?.selected_broadcast_pack_id ?? null,
          timestamp,
          timestamp,
          iso(nowMs + CHALLENGE_TIMEOUT_MS),
        );

      return this.getMatch(id);
    })();
  }

  setMessageId(matchId, messageId) {
    const result = this.database
      .prepare(`
        UPDATE arena_matches
        SET message_id = ?
        WHERE id = ? AND message_id IS NULL
      `)
      .run(messageId, matchId);
    if (result.changes !== 1) {
      throw arenaError(
        "MESSAGE_ALREADY_SET",
        "The Arena message was already assigned.",
      );
    }
    return this.getMatch(matchId);
  }

  setControlMessageId(
    matchId,
    messageId,
    expectedRound,
    nowMs = this.now(),
  ) {
    if (!Number.isInteger(expectedRound) || expectedRound < 1) {
      throw arenaError(
        "INVALID_CONTROL_ROUND",
        "That Arena control round is invalid.",
      );
    }
    const result = this.database
      .prepare(`
        UPDATE arena_matches
        SET
          control_message_id = ?,
          control_round = ?,
          last_transition_at = ?,
          expires_at = ?
        WHERE
          id = ?
          AND status = 'round_select'
          AND current_round = ?
          AND control_message_id IS NULL
      `)
      .run(
        messageId,
        expectedRound,
        iso(nowMs),
        iso(nowMs + ROUND_TIMEOUT_MS),
        matchId,
        expectedRound,
      );
    if (result.changes !== 1) {
      throw arenaError(
        "STALE_CONTROL_HANDOFF",
        "That round already has a newer Arena control.",
      );
    }
    return this.getMatch(matchId);
  }

  getTacticChoice(matchId, roundNumber, userId) {
    return (
      this.database
        .prepare(`
          SELECT tactic, selected_at
          FROM arena_tactic_choices
          WHERE match_id = ? AND round_number = ? AND user_id = ?
        `)
        .get(matchId, roundNumber, userId) ?? null
    );
  }

  getLockedTacticCount(matchId, roundNumber) {
    return this.database
      .prepare(`
        SELECT COUNT(*) AS count
        FROM arena_tactic_choices
        WHERE match_id = ? AND round_number = ?
      `)
      .get(matchId, roundNumber).count;
  }

  getAvailableGadgets(guildId, userId) {
    return this.database
      .prepare(`
        SELECT gadget_id, quantity
        FROM arena_inventory
        WHERE guild_id = ? AND user_id = ? AND quantity > 0
        ORDER BY gadget_id
      `)
      .all(guildId, userId)
      .filter((row) => isGadget(row.gadget_id));
  }

  selectEquipment(
    matchId,
    userId,
    gadgetId = null,
    nowMs = this.now(),
  ) {
    return this.database.transaction(() => {
      const match = this.getMatch(matchId);
      if (!match) {
        throw arenaError("MATCH_NOT_FOUND", "That Arena file does not exist.");
      }
      if (match.status !== "equipment_select") {
        throw arenaError(
          "STALE_MATCH",
          "That match is no longer selecting equipment.",
        );
      }
      if (new Date(match.expires_at).getTime() <= nowMs) {
        throw arenaError(
          "EQUIPMENT_EXPIRED",
          "The equipment deadline has already passed.",
        );
      }
      const side =
        userId === match.challenger_id
          ? "challenger"
          : userId === match.opponent_id
            ? "opponent"
            : null;
      if (!side) {
        throw arenaError(
          "NOT_PARTICIPANT",
          "You are not assigned to this Arena file.",
        );
      }
      if (match[`${side}_equipment_locked`]) {
        return {
          state: "already_chosen",
          match,
          gadgetId: match[`${side}_gadget_id`],
        };
      }
      if (gadgetId && !isGadget(gadgetId)) {
        throw arenaError("INVALID_GADGET", "That gadget is not authorized.");
      }
      if (gadgetId) {
        const reserved = this.database
          .prepare(`
            UPDATE arena_inventory
            SET quantity = quantity - 1
            WHERE
              guild_id = ?
              AND user_id = ?
              AND gadget_id = ?
              AND quantity > 0
          `)
          .run(match.guild_id, userId, gadgetId);
        if (reserved.changes !== 1) {
          throw arenaError(
            "GADGET_NOT_OWNED",
            "That gadget is no longer available in your inventory.",
          );
        }
      }
      const timestamp = iso(nowMs);
      this.database
        .prepare(`
          UPDATE arena_matches
          SET
            ${side}_gadget_id = ?,
            ${side}_gadget_reserved = ?,
            ${side}_equipment_locked = 1,
            last_transition_at = ?
          WHERE id = ? AND status = 'equipment_select'
        `)
        .run(gadgetId, Number(Boolean(gadgetId)), timestamp, matchId);

      const updated = this.getMatch(matchId);
      const ready =
        updated.challenger_equipment_locked &&
        updated.opponent_equipment_locked;
      if (ready) {
        this.database
          .prepare(`
            UPDATE arena_matches
            SET
              status = 'round_select',
              current_round = 1,
              last_transition_at = ?,
              expires_at = ?
            WHERE id = ? AND status = 'equipment_select'
          `)
          .run(timestamp, iso(nowMs + ROUND_TIMEOUT_MS), matchId);
      }
      return {
        state: ready ? "ready" : "waiting",
        match: this.getMatch(matchId),
        gadgetId,
      };
    })();
  }

  accept(matchId, userId, nowMs = this.now()) {
    return this.database.transaction(() => {
      const match = this.getMatch(matchId);
      if (!match) {
        throw arenaError("MATCH_NOT_FOUND", "That Arena file does not exist.");
      }
      if (match.opponent_id !== userId) {
        throw arenaError(
          "NOT_OPPONENT",
          "Only the challenged player can accept this match.",
        );
      }
      if (match.status !== "pending") {
        throw arenaError(
          "STALE_MATCH",
          "That challenge has already been handled.",
        );
      }
      if (new Date(match.expires_at).getTime() <= nowMs) {
        throw arenaError("MATCH_EXPIRED", "That challenge already expired.");
      }

      const timestamp = iso(nowMs);
      let nextStatus = "equipment_select";
      let currentRound = 0;
      let challengerRoundWins = 0;
      let expiresAt = iso(nowMs + EQUIPMENT_TIMEOUT_MS);
      let artifactFee = 0;

      if (match.match_mode === "standard" && !match.ranked) {
        nextStatus = "round_select";
        currentRound = 1;
        expiresAt = iso(nowMs + ROUND_TIMEOUT_MS);
      } else if (match.match_mode === "blacksite") {
        const artifact = getItem(match.artifact_id);
        if (!artifact || !isArtifact(artifact.id)) {
          throw arenaError(
            "INVALID_ARTIFACT",
            "The attached Artifact is no longer recognized.",
          );
        }
        const user = this.database
          .prepare(`
            SELECT credits
            FROM agent_j_users
            WHERE guild_id = ? AND user_id = ?
          `)
          .get(match.guild_id, match.challenger_id);
        if (!user || user.credits < artifact.activationPrice) {
          throw arenaError(
            "INSUFFICIENT_ACTIVATION_CREDITS",
            `The challenger needs **${artifact.activationPrice} BC** to activate ${artifact.name}.`,
          );
        }
        const cooldown = this.database
          .prepare(`
            SELECT last_activated_at
            FROM arena_artifact_cooldowns
            WHERE guild_id = ? AND user_id = ? AND artifact_id = ?
          `)
          .get(
            match.guild_id,
            match.challenger_id,
            match.artifact_id,
          );
        if (cooldown) {
          const availableAt =
            new Date(cooldown.last_activated_at).getTime() +
            ARTIFACT_COOLDOWN_MS;
          if (availableAt > nowMs) {
            throw arenaError(
              "ARTIFACT_COOLDOWN",
              "That Artifact returned to lockdown before acceptance.",
              { until: iso(availableAt) },
            );
          }
        }
        artifactFee = artifact.activationPrice;
        const balance = user.credits - artifactFee;
        this.database
          .prepare(`
            UPDATE agent_j_users
            SET credits = ?, updated_at = ?
            WHERE guild_id = ? AND user_id = ?
          `)
          .run(
            balance,
            timestamp,
            match.guild_id,
            match.challenger_id,
          );
        this.database
          .prepare(`
            INSERT INTO economy_ledger (
              id,
              idempotency_key,
              guild_id,
              user_id,
              amount,
              balance_after,
              reason,
              reference_id,
              created_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'artifact_activation', ?, ?)
          `)
          .run(
            this.idFactory(),
            `artifact-activate:${match.id}`,
            match.guild_id,
            match.challenger_id,
            -artifactFee,
            balance,
            match.id,
            timestamp,
          );
        this.database
          .prepare(`
            INSERT INTO arena_artifact_cooldowns (
              guild_id,
              user_id,
              artifact_id,
              last_activated_at
            ) VALUES (?, ?, ?, ?)
            ON CONFLICT (guild_id, user_id, artifact_id)
            DO UPDATE SET last_activated_at = excluded.last_activated_at
          `)
          .run(
            match.guild_id,
            match.challenger_id,
            match.artifact_id,
            timestamp,
          );
        nextStatus = "round_select";
        currentRound = 1;
        challengerRoundWins = Number(
          match.artifact_id === "artifact_continuity_seal",
        );
        expiresAt = iso(nowMs + ROUND_TIMEOUT_MS);
      }
      const result = this.database
        .prepare(`
          UPDATE arena_matches
          SET
            status = ?,
            current_round = ?,
            challenger_round_wins = ?,
            challenger_gadget_id = ?,
            challenger_gadget_reserved = ?,
            challenger_equipment_locked = ?,
            opponent_equipment_locked = ?,
            artifact_activation_fee = ?,
            accepted_at = ?,
            last_transition_at = ?,
            expires_at = ?
          WHERE id = ? AND status = 'pending'
        `)
        .run(
          nextStatus,
          currentRound,
          challengerRoundWins,
          match.match_mode === "blacksite" ? match.artifact_id : null,
          0,
          Number(match.match_mode === "blacksite" || !match.ranked),
          Number(match.match_mode === "blacksite" || !match.ranked),
          artifactFee,
          timestamp,
          timestamp,
          expiresAt,
          matchId,
        );
      if (result.changes !== 1) {
        throw arenaError(
          "STALE_MATCH",
          "That challenge was handled by another interaction.",
        );
      }
      return this.getMatch(matchId);
    })();
  }

  decline(matchId, userId, nowMs = this.now()) {
    const timestamp = iso(nowMs);
    const result = this.database
      .prepare(`
        UPDATE arena_matches
        SET status = 'declined', last_transition_at = ?, resolved_at = ?
        WHERE id = ? AND status = 'pending' AND opponent_id = ?
      `)
      .run(timestamp, timestamp, matchId, userId);
    if (result.changes !== 1) {
      const match = this.getMatch(matchId);
      if (!match) {
        throw arenaError("MATCH_NOT_FOUND", "That Arena file does not exist.");
      }
      if (match.opponent_id !== userId) {
        throw arenaError(
          "NOT_OPPONENT",
          "Only the challenged player can decline this match.",
        );
      }
      throw arenaError(
        "STALE_MATCH",
        "That challenge has already been handled.",
      );
    }
    return this.getMatch(matchId);
  }

  submitTactic(
    matchId,
    userId,
    tactic,
    expectedRound,
    nowMs = this.now(),
  ) {
    if (!isTactic(tactic)) {
      throw arenaError("INVALID_TACTIC", "That tactic is not authorized.");
    }
    if (!Number.isInteger(expectedRound) || expectedRound < 1) {
      throw arenaError(
        "INVALID_CONTROL_ROUND",
        "That tactic control is missing its round assignment.",
      );
    }

    return this.database.transaction(() => {
      const match = this.getMatch(matchId);
      if (!match) {
        throw arenaError("MATCH_NOT_FOUND", "That Arena file does not exist.");
      }
      if (match.status !== "round_select") {
        throw arenaError(
          "STALE_MATCH",
          "That round is no longer accepting tactics.",
        );
      }
      if (match.current_round !== expectedRound) {
        throw arenaError(
          "STALE_ROUND_CONTROL",
          "That tactic picker belongs to an earlier Arena round.",
        );
      }
      if (
        userId !== match.challenger_id &&
        userId !== match.opponent_id
      ) {
        throw arenaError(
          "NOT_PARTICIPANT",
          "You are not assigned to this Arena file.",
        );
      }
      if (new Date(match.expires_at).getTime() <= nowMs) {
        throw arenaError(
          "ROUND_EXPIRED",
          "The tactic deadline has already passed.",
        );
      }

      const existing = this.database
        .prepare(`
          SELECT tactic
          FROM arena_tactic_choices
          WHERE match_id = ? AND round_number = ? AND user_id = ?
        `)
        .get(matchId, match.current_round, userId);
      if (existing) {
        return {
          state: "already_chosen",
          tactic: existing.tactic,
          match,
        };
      }

      this.database
        .prepare(`
          INSERT INTO arena_tactic_choices (
            match_id,
            round_number,
            user_id,
            tactic,
            selected_at
          ) VALUES (?, ?, ?, ?, ?)
        `)
        .run(
          matchId,
          match.current_round,
          userId,
          tactic,
          iso(nowMs),
        );

      const choices = this.database
        .prepare(`
          SELECT user_id, tactic
          FROM arena_tactic_choices
          WHERE match_id = ? AND round_number = ?
        `)
        .all(matchId, match.current_round);
      if (choices.length < 2) {
        return {
          state: "waiting",
          match: this.getMatch(matchId),
        };
      }

      const byUser = new Map(
        choices.map((choice) => [choice.user_id, choice.tactic]),
      );
      const challengerTactic = byUser.get(match.challenger_id);
      const opponentTactic = byUser.get(match.opponent_id);
      if (!challengerTactic || !opponentTactic) {
        throw arenaError(
          "CHOICE_INTEGRITY",
          "The Arena tactic record is incomplete.",
        );
      }

      const round = resolveRound({
        challengerTactic,
        opponentTactic,
        randomInt: this.randomInt,
        roundNumber: match.current_round,
        challengerRoundWins: match.challenger_round_wins,
        opponentRoundWins: match.opponent_round_wins,
        challengerGadgetId: match.challenger_gadget_id,
        opponentGadgetId: match.opponent_gadget_id,
        priorRounds: this.getRounds(matchId),
      });
      const winnerId =
        round.winnerSide === "challenger"
          ? match.challenger_id
          : match.opponent_id;
      const timestamp = iso(nowMs);

      this.database
        .prepare(`
          INSERT INTO arena_rounds (
            match_id,
            round_number,
            challenger_tactic,
            opponent_tactic,
            challenger_initial_roll,
            opponent_initial_roll,
            challenger_final_raw_roll,
            opponent_final_raw_roll,
            challenger_tactic_bonus,
            opponent_tactic_bonus,
            challenger_gadget_effect,
            opponent_gadget_effect,
            challenger_gadget_modifier,
            opponent_gadget_modifier,
            tie_rolls_json,
            challenger_total,
            opponent_total,
            winner_id,
            narration_id,
            resolved_at
          ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
          )
        `)
        .run(
          matchId,
          match.current_round,
          challengerTactic,
          opponentTactic,
          round.challengerInitialRoll,
          round.opponentInitialRoll,
          round.challengerFinalRawRoll,
          round.opponentFinalRawRoll,
          round.challengerTacticBonus,
          round.opponentTacticBonus,
          round.challengerGadgetEffect,
          round.opponentGadgetEffect,
          round.challengerGadgetModifier,
          round.opponentGadgetModifier,
          JSON.stringify(round.tieRolls),
          round.challengerTotal,
          round.opponentTotal,
          winnerId,
          round.narrationId,
          timestamp,
        );

      const challengerWins =
        match.challenger_round_wins +
        Number(winnerId === match.challenger_id);
      const opponentWins =
        match.opponent_round_wins +
        Number(winnerId === match.opponent_id);
      const complete = challengerWins >= 2 || opponentWins >= 2;

      this.database
        .prepare(`
          UPDATE arena_matches
          SET
            status = ?,
            current_round = ?,
            challenger_round_wins = ?,
            opponent_round_wins = ?,
            winner_id = ?,
            control_message_id = NULL,
            control_round = NULL,
            last_transition_at = ?,
            resolved_at = ?,
            expires_at = ?
          WHERE id = ? AND status = 'round_select'
        `)
        .run(
          complete ? "complete" : "round_select",
          complete ? match.current_round : match.current_round + 1,
          challengerWins,
          opponentWins,
          complete
            ? challengerWins >= 2
              ? match.challenger_id
              : match.opponent_id
            : null,
          timestamp,
          complete ? timestamp : null,
          complete
            ? timestamp
            : iso(nowMs + ROUND_TIMEOUT_MS),
          matchId,
        );

      if (complete) {
        this.awardCompletedMatch(matchId, nowMs);
      }

      return {
        state: complete ? "complete" : "round_resolved",
        match: this.getMatch(matchId),
        round: this.getRounds(matchId).at(-1),
        previousControlMessageId: match.control_message_id,
        previousControlRound: match.control_round,
      };
    })();
  }

  awardCompletedMatch(matchId, nowMs = this.now()) {
    return this.database.transaction(() => {
      const match = this.getMatch(matchId);
      if (!match || match.status !== "complete" || !match.winner_id) {
        throw arenaError(
          "MATCH_NOT_COMPLETE",
          "Only a completed Arena match can be rewarded.",
        );
      }
      if (match.progression_awarded) {
        return match;
      }
      const existing = this.database
        .prepare(`
          SELECT 1
          FROM economy_ledger
          WHERE idempotency_key IN (?, ?)
          LIMIT 1
        `)
        .get(
          `match-reward:${match.id}:${match.challenger_id}`,
          `match-reward:${match.id}:${match.opponent_id}`,
        );
      if (existing) {
        return this.getMatch(matchId);
      }

      const timestamp = iso(nowMs);
      const winner = this.database
        .prepare(`
          SELECT selected_victory_stamp_id
          FROM agent_j_users
          WHERE guild_id = ? AND user_id = ?
        `)
        .get(match.guild_id, match.winner_id);

      if (match.match_mode === "blacksite") {
        for (const userId of [
          match.challenger_id,
          match.opponent_id,
        ]) {
          const won = userId === match.winner_id;
          this.database
            .prepare(`
              UPDATE agent_j_users
              SET
                artifact_wins = artifact_wins + ?,
                artifact_losses = artifact_losses + ?,
                updated_at = ?
              WHERE guild_id = ? AND user_id = ?
            `)
            .run(
              Number(won),
              Number(!won),
              timestamp,
              match.guild_id,
              userId,
            );
        }
        this.database
          .prepare(`
            UPDATE arena_matches
            SET victory_stamp_id = ?, progression_awarded = 1
            WHERE id = ?
          `)
          .run(winner?.selected_victory_stamp_id ?? null, match.id);
        return this.getMatch(matchId);
      }

      if (!match.ranked) {
        this.database
          .prepare(`
            UPDATE arena_matches
            SET victory_stamp_id = ?, progression_awarded = 1
            WHERE id = ?
          `)
          .run(winner?.selected_victory_stamp_id ?? null, match.id);
        return this.getMatch(matchId);
      }

      const rewardByUser = new Map();
      const dateKey = timestamp.slice(0, 10);
      for (const userId of [
        match.challenger_id,
        match.opponent_id,
      ]) {
        const user = this.database
          .prepare(`
            SELECT *
            FROM agent_j_users
            WHERE guild_id = ? AND user_id = ?
          `)
          .get(match.guild_id, userId);
        const won = userId === match.winner_id;
        const gadgetId =
          userId === match.challenger_id
            ? match.challenger_gadget_id
            : match.opponent_gadget_id;
        const nextStreak = won ? user.current_streak + 1 : 0;
        const streakBonus = won
          ? nextStreak >= 4
            ? 6
            : nextStreak === 3
              ? 4
              : nextStreak === 2
                ? 2
                : 0
          : 0;
        const firstToday = user.daily_earned_date !== dateKey;
        const currentDaily = firstToday ? 0 : user.daily_earned;
        const base =
          gadgetId === "fake_bureau_badge"
            ? won
              ? 20
              : 0
            : won
              ? 12
              : 4;
        const uncapped = base + (firstToday ? 5 : 0) + streakBonus;
        const reward = Math.max(0, Math.min(uncapped, 60 - currentDaily));
        const balance = user.credits + reward;
        const reputation = user.reputation + (won ? 10 : 3);
        const bestStreak = Math.max(user.best_streak, nextStreak);

        this.database
          .prepare(`
            UPDATE agent_j_users
            SET
              credits = ?,
              reputation = ?,
              wins = wins + ?,
              losses = losses + ?,
              current_streak = ?,
              best_streak = ?,
              daily_earned = ?,
              daily_earned_date = ?,
              updated_at = ?
            WHERE guild_id = ? AND user_id = ?
          `)
          .run(
            balance,
            reputation,
            Number(won),
            Number(!won),
            nextStreak,
            bestStreak,
            currentDaily + reward,
            dateKey,
            timestamp,
            match.guild_id,
            userId,
          );
        this.database
          .prepare(`
            INSERT INTO economy_ledger (
              id,
              idempotency_key,
              guild_id,
              user_id,
              amount,
              balance_after,
              reason,
              reference_id,
              created_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'arena_match_reward', ?, ?)
          `)
          .run(
            this.idFactory(),
            `match-reward:${match.id}:${userId}`,
            match.guild_id,
            userId,
            reward,
            balance,
            match.id,
            timestamp,
          );
        rewardByUser.set(userId, reward);
      }
      this.database
        .prepare(`
          UPDATE arena_matches
          SET
            challenger_reward = ?,
            opponent_reward = ?,
            victory_stamp_id = ?,
            progression_awarded = 1
          WHERE id = ?
        `)
        .run(
          rewardByUser.get(match.challenger_id) ?? 0,
          rewardByUser.get(match.opponent_id) ?? 0,
          winner?.selected_victory_stamp_id ?? null,
          match.id,
        );
      return this.getMatch(matchId);
    })();
  }

  refundMatchAssets(matchId, nowMs = this.now()) {
    return this.database.transaction(() => {
      const match = this.getMatch(matchId);
      if (!match || match.status === "complete") {
        return match;
      }
      for (const side of ["challenger", "opponent"]) {
        const reserved = match[`${side}_gadget_reserved`];
        const gadgetId = match[`${side}_gadget_id`];
        if (!reserved || !gadgetId || !isGadget(gadgetId)) {
          continue;
        }
        const userId = match[`${side}_id`];
        this.database
          .prepare(`
            INSERT INTO arena_inventory (
              guild_id,
              user_id,
              gadget_id,
              quantity
            ) VALUES (?, ?, ?, 1)
            ON CONFLICT (guild_id, user_id, gadget_id)
            DO UPDATE SET quantity = MIN(quantity + 1, 20)
          `)
          .run(match.guild_id, userId, gadgetId);
        this.database
          .prepare(`
            UPDATE arena_matches
            SET ${side}_gadget_reserved = 0
            WHERE id = ?
          `)
          .run(match.id);
      }

      if (
        match.artifact_activation_fee > 0 &&
        !match.artifact_activation_refunded
      ) {
        const user = this.database
          .prepare(`
            SELECT credits
            FROM agent_j_users
            WHERE guild_id = ? AND user_id = ?
          `)
          .get(match.guild_id, match.challenger_id);
        const balance = user.credits + match.artifact_activation_fee;
        const timestamp = iso(nowMs);
        this.database
          .prepare(`
            UPDATE agent_j_users
            SET credits = ?, updated_at = ?
            WHERE guild_id = ? AND user_id = ?
          `)
          .run(
            balance,
            timestamp,
            match.guild_id,
            match.challenger_id,
          );
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
            ) VALUES (?, ?, ?, ?, ?, ?, 'artifact_activation_refund', ?, ?)
          `)
          .run(
            this.idFactory(),
            `artifact-refund:${match.id}`,
            match.guild_id,
            match.challenger_id,
            match.artifact_activation_fee,
            balance,
            match.id,
            timestamp,
          );
        this.database
          .prepare(`
            DELETE FROM arena_artifact_cooldowns
            WHERE
              guild_id = ?
              AND user_id = ?
              AND artifact_id = ?
              AND last_activated_at = ?
          `)
          .run(
            match.guild_id,
            match.challenger_id,
            match.artifact_id,
            match.accepted_at,
          );
        this.database
          .prepare(`
            UPDATE arena_matches
            SET artifact_activation_refunded = 1
            WHERE id = ?
          `)
          .run(match.id);
      }
      return this.getMatch(matchId);
    })();
  }

  getUnarchivedCompletedMatches(limit = 25) {
    return this.database
      .prepare(`
        SELECT *
        FROM arena_matches
        WHERE status = 'complete' AND archive_message_id IS NULL
        ORDER BY resolved_at ASC
        LIMIT ?
      `)
      .all(limit);
  }

  setArchiveMessageId(matchId, messageId) {
    this.database
      .prepare(`
        UPDATE arena_matches
        SET archive_message_id = ?
        WHERE id = ? AND archive_message_id IS NULL
      `)
      .run(messageId, matchId);
    return this.getMatch(matchId);
  }

  queueMessageCleanup({
    matchId,
    guildId,
    channelId,
    messageId,
    deleteAfterMs,
  }) {
    const deleteAfter = iso(deleteAfterMs);
    this.database
      .prepare(`
        INSERT INTO arena_message_cleanup (
          message_id,
          match_id,
          guild_id,
          channel_id,
          delete_after
        )
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(message_id) DO UPDATE SET
          delete_after = CASE
            WHEN excluded.delete_after < arena_message_cleanup.delete_after
              THEN excluded.delete_after
            ELSE arena_message_cleanup.delete_after
          END
      `)
      .run(messageId, matchId, guildId, channelId, deleteAfter);
    return this.database
      .prepare(`
        SELECT *
        FROM arena_message_cleanup
        WHERE message_id = ?
      `)
      .get(messageId);
  }

  getDueMessageCleanup(nowMs = this.now(), limit = 50) {
    return this.database
      .prepare(`
        SELECT *
        FROM arena_message_cleanup
        WHERE delete_after <= ?
        ORDER BY delete_after ASC
        LIMIT ?
      `)
      .all(iso(nowMs), limit);
  }

  completeMessageCleanup(messageId) {
    return (
      this.database
        .prepare(`
          DELETE FROM arena_message_cleanup
          WHERE message_id = ?
        `)
        .run(messageId).changes > 0
    );
  }

  retryMessageCleanup(messageId, delayMs = 60_000) {
    return (
      this.database
        .prepare(`
          UPDATE arena_message_cleanup
          SET
            attempts = attempts + 1,
            delete_after = ?
          WHERE message_id = ?
        `)
        .run(iso(this.now() + delayMs), messageId).changes > 0
    );
  }

  sweepExpired(nowMs = this.now()) {
    const due = this.database
      .prepare(`
        SELECT *
        FROM arena_matches
        WHERE
          (
            status IN ('pending', 'equipment_select')
            OR (
              status = 'round_select'
              AND control_message_id IS NOT NULL
            )
          )
          AND expires_at <= ?
        ORDER BY expires_at
      `)
      .all(iso(nowMs));
    const transitions = [];

    for (const match of due) {
      const transition = this.database.transaction(() => {
        const current = this.getMatch(match.id);
        if (
          !current ||
          !ACTIVE_STATUSES.includes(current.status) ||
          new Date(current.expires_at).getTime() > nowMs
        ) {
          return null;
        }

        const timestamp = iso(nowMs);
        if (current.status === "pending") {
          const changed = this.database
            .prepare(`
              UPDATE arena_matches
              SET status = 'expired', last_transition_at = ?, resolved_at = ?
              WHERE id = ? AND status = 'pending'
            `)
            .run(timestamp, timestamp, current.id);
          return changed.changes === 1
            ? { ...current, nextStatus: "expired" }
            : null;
        }

        const chosen = new Set();
        if (current.status === "equipment_select") {
          if (current.challenger_equipment_locked) {
            chosen.add(current.challenger_id);
          }
          if (current.opponent_equipment_locked) {
            chosen.add(current.opponent_id);
          }
        } else {
          const choices = this.database
            .prepare(`
              SELECT user_id
              FROM arena_tactic_choices
              WHERE match_id = ? AND round_number = ?
            `)
            .all(current.id, current.current_round);
          for (const choice of choices) {
            chosen.add(choice.user_id);
          }
        }
        let abandonedBy = null;
        if (chosen.size === 1) {
          abandonedBy = chosen.has(current.challenger_id)
            ? current.opponent_id
            : current.challenger_id;
        }

        const changed = this.database
          .prepare(`
            UPDATE arena_matches
            SET
              status = 'abandoned',
              abandoned_by_user_id = ?,
              last_transition_at = ?,
              resolved_at = ?
            WHERE id = ? AND status IN ('equipment_select', 'round_select')
          `)
          .run(abandonedBy, timestamp, timestamp, current.id);
        if (changed.changes !== 1) {
          return null;
        }
        this.refundMatchAssets(current.id, nowMs);

        if (abandonedBy) {
          this.database
            .prepare(`
              INSERT OR IGNORE INTO arena_abandonments (
                match_id,
                guild_id,
                user_id,
                occurred_at
              ) VALUES (?, ?, ?, ?)
            `)
            .run(current.id, current.guild_id, abandonedBy, timestamp);
          const count = this.database
            .prepare(`
              SELECT COUNT(*) AS count
              FROM arena_abandonments
              WHERE guild_id = ? AND user_id = ? AND occurred_at >= ?
            `)
            .get(
              current.guild_id,
              abandonedBy,
              iso(nowMs - ABANDONMENT_WINDOW_MS),
            ).count;
          const lockMs =
            count >= 3
              ? ABANDONMENT_LOCKOUT_MS
              : ABANDONMENT_COOLDOWN_MS;
          this.database
            .prepare(`
              UPDATE agent_j_users
              SET arena_locked_until = ?, updated_at = ?
              WHERE guild_id = ? AND user_id = ?
            `)
            .run(
              iso(nowMs + lockMs),
              timestamp,
              current.guild_id,
              abandonedBy,
            );
        }

        return {
          ...current,
          nextStatus: "abandoned",
          abandonedByUserId: abandonedBy,
        };
      })();
      if (transition) {
        transitions.push(transition);
      }
    }
    return transitions;
  }

  cancelInterruptedOnStartup(nowMs = this.now()) {
    const timestamp = iso(nowMs);
    return this.database.transaction(() => {
      this.database
        .prepare(`
          UPDATE arena_matches
          SET status = 'expired', last_transition_at = ?, resolved_at = ?
          WHERE status = 'pending' AND expires_at <= ?
        `)
        .run(timestamp, timestamp, timestamp);

      const interrupted = this.database
        .prepare(`
          SELECT *
          FROM arena_matches
          WHERE status IN ('equipment_select', 'round_select')
        `)
        .all();
      this.database
        .prepare(`
          UPDATE arena_matches
          SET
            status = 'technical_cancel',
            last_transition_at = ?,
            resolved_at = ?
          WHERE status IN ('equipment_select', 'round_select')
        `)
        .run(timestamp, timestamp);
      for (const match of interrupted) {
        this.refundMatchAssets(match.id, nowMs);
      }
      return interrupted;
    })();
  }

  cancelByMessage(
    guildId,
    channelId,
    messageId,
    nowMs = this.now(),
  ) {
    const timestamp = iso(nowMs);
    const match = this.getActiveMatchByMessage(
      guildId,
      channelId,
      messageId,
    );
    if (!match) {
      return null;
    }
    const result = this.database
      .prepare(`
        UPDATE arena_matches
        SET
          status = 'technical_cancel',
          last_transition_at = ?,
          resolved_at = ?
        WHERE id = ? AND status IN ('pending', 'equipment_select', 'round_select')
      `)
      .run(timestamp, timestamp, match.id);
    if (result.changes !== 1) {
      return null;
    }
    this.refundMatchAssets(match.id, nowMs);
    return this.getMatch(match.id);
  }

  technicalCancel(matchId, nowMs = this.now()) {
    const timestamp = iso(nowMs);
    const result = this.database
      .prepare(`
        UPDATE arena_matches
        SET
          status = 'technical_cancel',
          last_transition_at = ?,
          resolved_at = ?
        WHERE id = ? AND status IN ('pending', 'equipment_select', 'round_select')
      `)
      .run(timestamp, timestamp, matchId);
    if (result.changes !== 1) {
      return null;
    }
    this.refundMatchAssets(matchId, nowMs);
    return this.getMatch(matchId);
  }

  diagnostics() {
    const active = this.database
      .prepare(`
        SELECT status, COUNT(*) AS count
        FROM arena_matches
        WHERE status IN ('pending', 'equipment_select', 'round_select')
        GROUP BY status
      `)
      .all();
    return Object.fromEntries(active.map((row) => [row.status, row.count]));
  }
}

export const ARENA_TIMINGS = Object.freeze({
  challengerCooldownMs: CHALLENGER_COOLDOWN_MS,
  pairCooldownMs: PAIR_COOLDOWN_MS,
  challengeTimeoutMs: CHALLENGE_TIMEOUT_MS,
  equipmentTimeoutMs: EQUIPMENT_TIMEOUT_MS,
  roundTimeoutMs: ROUND_TIMEOUT_MS,
  artifactCooldownMs: ARTIFACT_COOLDOWN_MS,
});
