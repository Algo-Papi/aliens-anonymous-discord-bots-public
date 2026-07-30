import { resolveRound, TACTICS } from "../src/arena/rules.js";
import {
  ARTIFACTS,
  GADGETS,
} from "../src/economy/catalog.js";
import { SeededRandom } from "../src/content/random.js";

const simulations = Number.parseInt(process.argv[2] ?? "100000", 10);
if (!Number.isInteger(simulations) || simulations < 1) {
  throw new TypeError("Simulation count must be a positive integer.");
}

function storedRound(round, challengerTactic, opponentTactic) {
  return {
    challenger_tactic: challengerTactic,
    opponent_tactic: opponentTactic,
    challenger_gadget_effect: round.challengerGadgetEffect,
    opponent_gadget_effect: round.opponentGadgetEffect,
  };
}

function simulateMatch(random, gadgetId) {
  let challengerWins =
    gadgetId === "artifact_continuity_seal" ? 1 : 0;
  let opponentWins = 0;
  const priorRounds = [];
  let roundNumber = 1;
  while (challengerWins < 2 && opponentWins < 2) {
    const challengerTactic = TACTICS[random.int(0, TACTICS.length)];
    const opponentTactic = TACTICS[random.int(0, TACTICS.length)];
    const round = resolveRound({
      challengerTactic,
      opponentTactic,
      challengerGadgetId: gadgetId,
      challengerRoundWins: challengerWins,
      opponentRoundWins: opponentWins,
      roundNumber,
      priorRounds,
      randomInt: (min, max) => random.int(min, max),
    });
    challengerWins += Number(round.winnerSide === "challenger");
    opponentWins += Number(round.winnerSide === "opponent");
    priorRounds.push(storedRound(round, challengerTactic, opponentTactic));
    roundNumber += 1;
  }
  return challengerWins >= 2;
}

function winRate(gadgetId, seed) {
  const random = new SeededRandom(seed);
  let wins = 0;
  for (let index = 0; index < simulations; index += 1) {
    wins += Number(simulateMatch(random, gadgetId));
  }
  return wins / simulations;
}

const baseline = winRate(null, 0x4a00);
const results = {
  simulationsPerItem: simulations,
  baseline,
  gadgets: {},
  artifacts: {},
};

for (const [index, gadget] of GADGETS.entries()) {
  const rate = winRate(gadget.id, 0x4a10 + index);
  results.gadgets[gadget.id] = {
    name: gadget.name,
    price: gadget.price,
    winRate: rate,
    percentagePointDelta: (rate - baseline) * 100,
  };
}

for (const [index, artifact] of ARTIFACTS.entries()) {
  const rate = winRate(artifact.id, 0x4b10 + index);
  results.artifacts[artifact.id] = {
    name: artifact.name,
    price: artifact.price,
    winRate: rate,
    percentagePointDelta: (rate - baseline) * 100,
  };
}

console.log(JSON.stringify(results, null, 2));
