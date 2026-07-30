import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { ArenaStore } from "../../src/arena/arena-store.js";
import { openDatabase } from "../../src/db/database.js";
import { EconomyStore } from "../../src/economy/economy-store.js";

function fixture(context, randomValues = []) {
  const directory = mkdtempSync(join(tmpdir(), "agent-j-economy-"));
  const database = openDatabase(join(directory, "economy.sqlite"));
  context.after(() => {
    database.close();
    rmSync(directory, { recursive: true, force: true });
  });
  let nowMs = Date.UTC(2026, 6, 28, 12, 0, 0);
  let id = 0;
  const queue = [...randomValues];
  const idFactory = () => `id-${++id}`;
  const economy = new EconomyStore(database, {
    now: () => nowMs,
    idFactory,
  });
  const arena = new ArenaStore(database, {
    now: () => nowMs,
    idFactory,
    randomIntFn: (min) => queue.shift() ?? min,
  });
  return {
    arena,
    database,
    economy,
    advance(milliseconds) {
      nowMs += milliseconds;
    },
  };
}

test("gadget purchases are atomic, inventoried, and idempotent", (context) => {
  const setup = fixture(context);
  const first = setup.economy.purchase({
    guildId: "guild",
    userId: "user",
    itemId: "noisy_cricket",
    idempotencyKey: "purchase-1",
  });
  assert.equal(first.balance, 2);
  assert.equal(
    setup.economy.getInventory("guild", "user")[0].quantity,
    1,
  );

  const replay = setup.economy.purchase({
    guildId: "guild",
    userId: "user",
    itemId: "noisy_cricket",
    idempotencyKey: "purchase-1",
  });
  assert.equal(replay.idempotent, true);
  assert.equal(
    setup.economy.getInventory("guild", "user")[0].quantity,
    1,
  );
  assert.equal(
    setup.database
      .prepare(
        "SELECT COUNT(*) AS count FROM economy_ledger WHERE idempotency_key = 'purchase-1'",
      )
      .get().count,
    1,
  );
});

test("equipment reservations return after technical cancellation", (context) => {
  const setup = fixture(context);
  setup.economy.purchase({
    guildId: "guild",
    userId: "challenger",
    itemId: "noisy_cricket",
    idempotencyKey: "purchase-1",
  });
  let match = setup.arena.createChallenge({
    guildId: "guild",
    channelId: "arena",
    challengerId: "challenger",
    opponentId: "opponent",
  });
  match = setup.arena.setMessageId(match.id, "message");
  setup.arena.accept(match.id, "opponent");
  setup.arena.selectEquipment(match.id, "challenger", "noisy_cricket");
  assert.equal(
    setup.economy.getInventory("guild", "challenger").length,
    0,
  );
  setup.arena.technicalCancel(match.id);
  assert.equal(
    setup.economy.getInventory("guild", "challenger")[0].quantity,
    1,
  );
});

test("ranked completion awards capped ledger-backed progression", (context) => {
  const setup = fixture(context, [90, 10, 0, 90, 10, 0]);
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
  setup.arena.submitTactic(match.id, "challenger", "blast", 1);
  setup.arena.submitTactic(match.id, "opponent", "dirty_trick", 1);
  setup.arena.submitTactic(match.id, "challenger", "blast", 2);
  const result = setup.arena.submitTactic(
    match.id,
    "opponent",
    "dirty_trick",
    2,
  );

  assert.equal(result.match.status, "complete");
  assert.equal(result.match.challenger_reward, 17);
  assert.equal(result.match.opponent_reward, 9);
  const winner = setup.economy.getUser("guild", "challenger");
  const loser = setup.economy.getUser("guild", "opponent");
  assert.equal(winner.credits, 37);
  assert.equal(winner.reputation, 10);
  assert.equal(winner.wins, 1);
  assert.equal(loser.credits, 29);
  assert.equal(loser.reputation, 3);
  assert.equal(loser.losses, 1);
});

test("artifact activation is charged on acceptance and refunded on failure", (context) => {
  const setup = fixture(context);
  setup.economy.ensureUser("guild", "challenger");
  setup.database
    .prepare(
      "UPDATE agent_j_users SET credits = 3000 WHERE guild_id = 'guild' AND user_id = 'challenger'",
    )
    .run();
  setup.economy.purchase({
    guildId: "guild",
    userId: "challenger",
    itemId: "artifact_orions_belt",
    idempotencyKey: "artifact-purchase",
  });
  let match = setup.arena.createChallenge({
    guildId: "guild",
    channelId: "arena",
    challengerId: "challenger",
    opponentId: "opponent",
    mode: "blacksite",
    artifactId: "artifact_orions_belt",
  });
  match = setup.arena.setMessageId(match.id, "message");
  match = setup.arena.accept(match.id, "opponent");
  assert.equal(match.status, "round_select");
  assert.equal(match.artifact_activation_fee, 75);
  assert.equal(
    setup.economy.getUser("guild", "challenger").credits,
    425,
  );
  setup.arena.technicalCancel(match.id);
  assert.equal(
    setup.economy.getUser("guild", "challenger").credits,
    500,
  );
  assert.equal(
    setup.database
      .prepare(
        "SELECT COUNT(*) AS count FROM arena_artifact_cooldowns",
      )
      .get().count,
    0,
  );
});

test("the third same-pair fight in 24 hours is equipment-free exhibition", (context) => {
  const setup = fixture(context, [
    90, 10, 0, 90, 10, 0,
    90, 10, 0, 90, 10, 0,
  ]);
  const completeFight = () => {
    let match = setup.arena.createChallenge({
      guildId: "guild",
      channelId: "arena",
      challengerId: "challenger",
      opponentId: "opponent",
    });
    match = setup.arena.setMessageId(match.id, `message-${match.id}`);
    setup.arena.accept(match.id, "opponent");
    setup.arena.selectEquipment(match.id, "challenger", null);
    setup.arena.selectEquipment(match.id, "opponent", null);
    setup.arena.submitTactic(match.id, "challenger", "blast", 1);
    setup.arena.submitTactic(match.id, "opponent", "dirty_trick", 1);
    setup.arena.submitTactic(match.id, "challenger", "blast", 2);
    return setup.arena.submitTactic(
      match.id,
      "opponent",
      "dirty_trick",
      2,
    ).match;
  };

  assert.equal(completeFight().ranked, 1);
  setup.advance(11 * 60_000);
  assert.equal(completeFight().ranked, 1);
  setup.advance(11 * 60_000);

  let exhibition = setup.arena.createChallenge({
    guildId: "guild",
    channelId: "arena",
    challengerId: "challenger",
    opponentId: "opponent",
  });
  exhibition = setup.arena.setMessageId(exhibition.id, "exhibition");
  exhibition = setup.arena.accept(exhibition.id, "opponent");
  assert.equal(exhibition.ranked, 0);
  assert.equal(exhibition.status, "round_select");
  assert.equal(exhibition.challenger_equipment_locked, 1);
  assert.equal(exhibition.opponent_equipment_locked, 1);
});
