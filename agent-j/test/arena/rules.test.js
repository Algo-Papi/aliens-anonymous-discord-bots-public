import assert from "node:assert/strict";
import test from "node:test";

import {
  TACTICS,
  resolveRound,
  tacticBonus,
} from "../../src/arena/rules.js";

test("all nine tactic pairings use the planned bonus", () => {
  const expectedWinners = {
    blast: "dirty_trick",
    dirty_trick: "shield",
    shield: "blast",
  };
  for (const first of TACTICS) {
    for (const second of TACTICS) {
      assert.equal(
        tacticBonus(first, second),
        expectedWinners[first] === second ? 15 : 0,
      );
    }
  }
});

test("tie rerolls preserve tactic bonuses and do not retrigger effects", () => {
  const queue = [50, 65, 70, 20, 0];
  const round = resolveRound({
    challengerTactic: "blast",
    opponentTactic: "dirty_trick",
    randomInt: () => queue.shift(),
  });
  assert.equal(round.challengerInitialRoll, 50);
  assert.equal(round.opponentInitialRoll, 65);
  assert.deepEqual(round.tieRolls, [{ challenger: 70, opponent: 20 }]);
  assert.equal(round.challengerTacticBonus, 15);
  assert.equal(round.opponentTacticBonus, 0);
  assert.equal(round.challengerTotal, 85);
  assert.equal(round.opponentTotal, 20);
});

test("first-use gadgets trigger once and expose their arithmetic", () => {
  const firstQueue = [50, 50, 0];
  const first = resolveRound({
    challengerTactic: "blast",
    opponentTactic: "blast",
    challengerGadgetId: "noisy_cricket",
    randomInt: () => firstQueue.shift(),
  });
  assert.equal(first.challengerGadgetModifier, 10);
  assert.match(first.challengerGadgetEffect, /Noisy Cricket: \+10/);

  const secondQueue = [50, 40, 0];
  const second = resolveRound({
    challengerTactic: "blast",
    opponentTactic: "blast",
    challengerGadgetId: "noisy_cricket",
    priorRounds: [
      {
        challenger_tactic: "blast",
        challenger_gadget_effect: first.challengerGadgetEffect,
      },
    ],
    roundNumber: 2,
    randomInt: () => secondQueue.shift(),
  });
  assert.equal(second.challengerGadgetModifier, 0);
  assert.equal(second.challengerGadgetEffect, null);
});

test("neuralyzer rerolls low raw values with a mandatory replacement", () => {
  const queue = [10, 50, 80, 0];
  const round = resolveRound({
    challengerTactic: "shield",
    opponentTactic: "shield",
    challengerGadgetId: "neuralyzer",
    randomInt: () => queue.shift(),
  });
  assert.equal(round.challengerInitialRoll, 10);
  assert.equal(round.challengerFinalRawRoll, 80);
  assert.match(round.challengerGadgetEffect, /10 → 80/);
});

test("Black Vault artifacts are excessive but mechanically explicit", () => {
  const galaxyQueue = [50, 50, 0];
  const galaxy = resolveRound({
    challengerTactic: "blast",
    opponentTactic: "blast",
    challengerGadgetId: "artifact_orions_belt",
    randomInt: () => galaxyQueue.shift(),
  });
  assert.equal(galaxy.challengerGadgetModifier, 15);
  assert.equal(galaxy.challengerTotal, 65);

  const buttonQueue = [10, 50, 0];
  const button = resolveRound({
    challengerTactic: "shield",
    opponentTactic: "shield",
    challengerGadgetId: "artifact_little_red_button",
    randomInt: () => buttonQueue.shift(),
  });
  assert.equal(button.winnerSide, "challenger");
  assert.equal(button.challengerTotal, 51);
  assert.match(button.challengerGadgetEffect, /Little Red Button/);
});
