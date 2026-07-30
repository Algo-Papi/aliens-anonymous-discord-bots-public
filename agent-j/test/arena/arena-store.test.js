import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { ArenaStore } from "../../src/arena/arena-store.js";
import { openDatabase } from "../../src/db/database.js";

function fixture(context, randomValues = []) {
  const directory = mkdtempSync(join(tmpdir(), "agent-j-arena-"));
  const database = openDatabase(join(directory, "arena.sqlite"));
  context.after(() => {
    database.close();
    rmSync(directory, { recursive: true, force: true });
  });
  let nowMs = Date.UTC(2026, 6, 28, 12, 0, 0);
  let id = 0;
  const queue = [...randomValues];
  const arena = new ArenaStore(database, {
    now: () => nowMs,
    idFactory: () => `match-${++id}`,
    randomIntFn: (min) => queue.shift() ?? min,
  });
  return {
    arena,
    database,
    now: () => nowMs,
    advance(milliseconds) {
      nowMs += milliseconds;
    },
  };
}

test("best-of-three match stores hidden choices and resolves exactly once", (context) => {
  const setup = fixture(context, [50, 50, 0, 50, 50, 0]);
  let match = setup.arena.createChallenge({
    guildId: "guild",
    channelId: "arena",
    challengerId: "challenger",
    opponentId: "opponent",
  });
  match = setup.arena.setMessageId(match.id, "message");
  assert.equal(match.control_message_id, null);
  match = setup.arena.accept(match.id, "opponent");
  assert.equal(match.status, "equipment_select");
  setup.arena.selectEquipment(match.id, "challenger", null);
  match = setup.arena.selectEquipment(match.id, "opponent", null).match;
  assert.equal(match.status, "round_select");
  match = setup.arena.setControlMessageId(
    match.id,
    "round-one-control",
    1,
  );
  assert.equal(match.control_message_id, "round-one-control");
  assert.equal(match.current_round, 1);

  const waiting = setup.arena.submitTactic(
    match.id,
    "challenger",
    "blast",
    1,
  );
  assert.equal(waiting.state, "waiting");
  assert.equal(
    setup.arena.getTacticChoice(match.id, 1, "challenger").tactic,
    "blast",
  );
  const roundOne = setup.arena.submitTactic(
    match.id,
    "opponent",
    "dirty_trick",
    1,
  );
  assert.equal(roundOne.state, "round_resolved");
  assert.equal(roundOne.match.current_round, 2);
  assert.equal(roundOne.match.challenger_round_wins, 1);
  assert.equal(roundOne.match.control_message_id, null);
  assert.throws(
    () =>
      setup.arena.submitTactic(
        match.id,
        "challenger",
        "dirty_trick",
        1,
      ),
    { code: "STALE_ROUND_CONTROL" },
  );
  assert.equal(
    setup.arena.getTacticChoice(match.id, 2, "challenger"),
    null,
  );
  setup.arena.setControlMessageId(match.id, "round-two-control", 2);
  assert.throws(
    () =>
      setup.arena.setControlMessageId(
        match.id,
        "delayed-round-one-control",
        1,
      ),
    { code: "STALE_CONTROL_HANDOFF" },
  );

  setup.arena.submitTactic(match.id, "challenger", "shield", 2);
  const complete = setup.arena.submitTactic(
    match.id,
    "opponent",
    "blast",
    2,
  );
  assert.equal(complete.state, "complete");
  assert.equal(complete.match.status, "complete");
  assert.equal(complete.match.winner_id, "challenger");
  assert.equal(setup.arena.getRounds(match.id).length, 2);

  assert.throws(
    () => setup.arena.submitTactic(match.id, "opponent", "blast", 2),
    { code: "STALE_MATCH" },
  );
});

test("only the opponent can accept and players cannot double-book", (context) => {
  const setup = fixture(context);
  const match = setup.arena.createChallenge({
    guildId: "guild",
    channelId: "arena",
    challengerId: "challenger",
    opponentId: "opponent",
  });
  assert.throws(
    () => setup.arena.accept(match.id, "challenger"),
    { code: "NOT_OPPONENT" },
  );
  assert.throws(
    () =>
      setup.arena.createChallenge({
        guildId: "guild",
        channelId: "arena",
        challengerId: "third",
        opponentId: "opponent",
      }),
    { code: "PLAYER_BUSY" },
  );
});

test("round timeout abandons without awarding a winner", (context) => {
  const setup = fixture(context);
  let match = setup.arena.createChallenge({
    guildId: "guild",
    channelId: "arena",
    challengerId: "challenger",
    opponentId: "opponent",
  });
  match = setup.arena.setMessageId(match.id, "message");
  setup.arena.accept(match.id, "opponent");
  setup.arena.selectEquipment(match.id, "challenger", null);
  setup.arena.selectEquipment(match.id, "opponent", null);
  setup.arena.setControlMessageId(match.id, "round-one-control", 1);
  setup.arena.submitTactic(match.id, "challenger", "blast", 1);
  setup.advance(36_000);
  const transitions = setup.arena.sweepExpired();
  assert.equal(transitions.length, 1);
  assert.equal(transitions[0].nextStatus, "abandoned");
  assert.equal(transitions[0].abandonedByUserId, "opponent");
  const stored = setup.arena.getMatch(match.id);
  assert.equal(stored.status, "abandoned");
  assert.equal(stored.winner_id, null);
});

test("an unpublished round control cannot create an abandonment", (context) => {
  const setup = fixture(context);
  let match = setup.arena.createChallenge({
    guildId: "guild",
    channelId: "arena",
    challengerId: "challenger",
    opponentId: "opponent",
  });
  match = setup.arena.setMessageId(match.id, "message");
  setup.arena.accept(match.id, "opponent");
  setup.arena.selectEquipment(match.id, "challenger", null);
  setup.arena.selectEquipment(match.id, "opponent", null);
  setup.advance(60_000);
  assert.deepEqual(setup.arena.sweepExpired(), []);
  assert.equal(setup.arena.getMatch(match.id).status, "round_select");
});

test("startup recovery technically cancels active matches", (context) => {
  const setup = fixture(context);
  let match = setup.arena.createChallenge({
    guildId: "guild",
    channelId: "arena",
    challengerId: "challenger",
    opponentId: "opponent",
  });
  match = setup.arena.setMessageId(match.id, "message");
  setup.arena.accept(match.id, "opponent");
  const interrupted = setup.arena.cancelInterruptedOnStartup();
  assert.equal(interrupted.length, 1);
  assert.equal(
    setup.arena.getMatch(match.id).status,
    "technical_cancel",
  );
});

test("Arena archive state and cleanup jobs persist across restarts", (context) => {
  const setup = fixture(context);
  const match = setup.arena.createChallenge({
    guildId: "guild",
    channelId: "arena",
    challengerId: "challenger",
    opponentId: "opponent",
  });
  setup.database
    .prepare(`
      UPDATE arena_matches
      SET status = 'complete', resolved_at = last_transition_at
      WHERE id = ?
    `)
    .run(match.id);

  assert.equal(setup.arena.getUnarchivedCompletedMatches().length, 1);
  const archived = setup.arena.setArchiveMessageId(
    match.id,
    "archive-message",
  );
  assert.equal(archived.archive_message_id, "archive-message");
  assert.equal(setup.arena.getUnarchivedCompletedMatches().length, 0);

  const cleanup = setup.arena.queueMessageCleanup({
    matchId: match.id,
    guildId: "guild",
    channelId: "arena",
    messageId: "live-result",
    deleteAfterMs: setup.now() + 300_000,
  });
  assert.equal(cleanup.attempts, 0);
  assert.deepEqual(setup.arena.getDueMessageCleanup(), []);
  setup.advance(300_000);
  assert.equal(
    setup.arena.getDueMessageCleanup()[0].message_id,
    "live-result",
  );
  assert.equal(setup.arena.retryMessageCleanup("live-result", 60_000), true);
  assert.deepEqual(setup.arena.getDueMessageCleanup(), []);
  setup.advance(60_000);
  assert.equal(setup.arena.getDueMessageCleanup()[0].attempts, 1);
  assert.equal(setup.arena.completeMessageCleanup("live-result"), true);
  assert.deepEqual(setup.arena.getDueMessageCleanup(), []);
});
