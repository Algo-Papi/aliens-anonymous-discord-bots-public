import { SeededRandom } from "../src/content/random.js";
import { TACTICS, resolveRound } from "../src/arena/rules.js";

const random = new SeededRandom(0x4a);
const randomInt = (min, max) => random.int(min, max);
const results = {};

for (const challengerTactic of TACTICS) {
  for (const opponentTactic of TACTICS) {
    const key = `${challengerTactic} vs ${opponentTactic}`;
    let challengerWins = 0;
    const simulations = 100_000;
    for (let index = 0; index < simulations; index += 1) {
      const round = resolveRound({
        challengerTactic,
        opponentTactic,
        randomInt,
      });
      challengerWins += Number(round.winnerSide === "challenger");
    }
    results[key] = {
      challengerWinRate: challengerWins / simulations,
      simulations,
    };
  }
}

console.log(JSON.stringify(results, null, 2));
