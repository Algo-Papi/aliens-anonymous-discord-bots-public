import { randomInt as cryptoRandomInt } from "node:crypto";

export const TACTICS = Object.freeze(["blast", "shield", "dirty_trick"]);

const BEATS = Object.freeze({
  blast: "dirty_trick",
  dirty_trick: "shield",
  shield: "blast",
});

const NARRATION_BY_TACTIC = Object.freeze({
  blast: Object.freeze([
    "noisy-cricket-debt-collector",
    "plasma-dry-cleaning-bill",
    "deatomizer-customer-service",
    "blast-radius-paperwork",
    "warning-shot-performance-review",
    "clean-suit-dirty-blast",
    "neuralyze-the-scoreboard",
    "make-this-look-good",
    "plasma-hr-complaint",
    "noisy-cricket-prenup",
    "blast-tax-deduction",
    "deatomizer-group-rate",
    "plasma-eviction-notice",
  ]),
  shield: Object.freeze([
    "shield-refund-denied",
    "bureaucratic-forcefield",
    "defensive-audit",
    "containment-copay",
    "heat-on-hold",
    "block-and-adjust-tie",
    "bureau-charged-admission",
    "public-embarrassment-unblocked",
    "shielded-child-support",
    "forcefield-dress-code",
    "defensive-cavity-search",
    "shield-warranty-hearing",
    "block-party-for-one",
  ]),
  dirty_trick: Object.freeze([
    "pocket-sand-classified",
    "illegal-worm-guy-assist",
    "evidence-locker-switcheroo",
    "intergalactic-cheap-shot",
    "field-improvisation",
    "evidence-bad-suit-good",
    "dirty-trick-clean-suit",
    "advanced-diplomacy",
    "neuralyzer-battery-swap",
    "worm-guy-custody-transfer",
    "forbidden-pocket-gravy",
    "evidence-bag-banana-peel",
    "illegal-third-elbow",
  ]),
});

export function isTactic(value) {
  return TACTICS.includes(value);
}

export function tacticBonus(tactic, opponentTactic) {
  if (!isTactic(tactic) || !isTactic(opponentTactic)) {
    throw new TypeError("Unknown Arena tactic.");
  }
  return BEATS[tactic] === opponentTactic ? 15 : 0;
}

function d100(randomInt) {
  return randomInt(1, 101);
}

function hasTriggered(priorRounds, side, marker) {
  const field = `${side}_gadget_effect`;
  return priorRounds.some((round) => rowText(round[field]).includes(marker));
}

function rowText(value) {
  return value == null ? "" : String(value);
}

function usedTactic(priorRounds, side, tactic) {
  return priorRounds.some(
    (round) => round[`${side}_tactic`] === tactic,
  );
}

function pushEffect(effects, side, text) {
  effects[side].push(text);
}

function applySpecializedTacticBonus(gadgetId, tactic, opponentTactic) {
  if (
    gadgetId === "questionably_licensed_deatomizer" &&
    tactic === "blast" &&
    opponentTactic === "dirty_trick"
  ) {
    return 25;
  }
  if (
    gadgetId === "taxpayer_funded_force_field" &&
    tactic === "shield" &&
    opponentTactic === "blast"
  ) {
    return 25;
  }
  if (
    gadgetId === "evidence_locker_switcheroo" &&
    tactic === "dirty_trick" &&
    opponentTactic === "shield"
  ) {
    return 25;
  }
  return tacticBonus(tactic, opponentTactic);
}

export function resolveRound({
  challengerTactic,
  opponentTactic,
  randomInt = cryptoRandomInt,
  roundNumber = 1,
  challengerRoundWins = 0,
  opponentRoundWins = 0,
  challengerGadgetId = null,
  opponentGadgetId = null,
  priorRounds = [],
}) {
  let challengerTacticBonus = applySpecializedTacticBonus(
    challengerGadgetId,
    challengerTactic,
    opponentTactic,
  );
  let opponentTacticBonus = applySpecializedTacticBonus(
    opponentGadgetId,
    opponentTactic,
    challengerTactic,
  );
  const effects = { challenger: [], opponent: [] };

  if (
    challengerGadgetId === "reverse_engineered_tic_tac_drive" &&
    opponentTacticBonus > 0 &&
    !hasTriggered(priorRounds, "challenger", "Tic Tac Drive")
  ) {
    opponentTacticBonus = 0;
    pushEffect(
      effects,
      "challenger",
      "Tic Tac Drive removed the opponent's tactic bonus",
    );
  }
  if (
    opponentGadgetId === "reverse_engineered_tic_tac_drive" &&
    challengerTacticBonus > 0 &&
    !hasTriggered(priorRounds, "opponent", "Tic Tac Drive")
  ) {
    challengerTacticBonus = 0;
    pushEffect(
      effects,
      "opponent",
      "Tic Tac Drive removed the opponent's tactic bonus",
    );
  }

  const challengerInitialRoll = d100(randomInt);
  const opponentInitialRoll = d100(randomInt);
  let challengerFinalRawRoll = challengerInitialRoll;
  let opponentFinalRawRoll = opponentInitialRoll;
  let challengerGadgetModifier = 0;
  let opponentGadgetModifier = 0;

  if (
    challengerGadgetId === "neuralyzer" &&
    challengerFinalRawRoll <= 25 &&
    !hasTriggered(priorRounds, "challenger", "Neuralyzer reroll")
  ) {
    challengerFinalRawRoll = d100(randomInt);
    pushEffect(
      effects,
      "challenger",
      `Neuralyzer reroll: ${challengerInitialRoll} → ${challengerFinalRawRoll}`,
    );
  }
  if (
    opponentGadgetId === "neuralyzer" &&
    opponentFinalRawRoll <= 25 &&
    !hasTriggered(priorRounds, "opponent", "Neuralyzer reroll")
  ) {
    opponentFinalRawRoll = d100(randomInt);
    pushEffect(
      effects,
      "opponent",
      `Neuralyzer reroll: ${opponentInitialRoll} → ${opponentFinalRawRoll}`,
    );
  }

  const applyNumericGadget = (
    side,
    gadgetId,
    tactic,
    opponentTacticValue,
    ownerWins,
    opposingWins,
  ) => {
    let modifier = 0;
    if (
      gadgetId === "noisy_cricket" &&
      tactic === "blast" &&
      !usedTactic(priorRounds, side, "blast")
    ) {
      modifier += 10;
      pushEffect(effects, side, "Noisy Cricket: +10");
    } else if (
      gadgetId === "pocket_shield_generator" &&
      tactic === "shield" &&
      !usedTactic(priorRounds, side, "shield")
    ) {
      modifier += 10;
      pushEffect(effects, side, "Pocket Shield Generator: +10");
    } else if (
      gadgetId === "cephalopod_ink_capsule" &&
      tactic === "dirty_trick" &&
      !usedTactic(priorRounds, side, "dirty_trick")
    ) {
      modifier += 10;
      pushEffect(effects, side, "Cephalopod Ink Capsule: +10");
    }

    if (gadgetId === "alien_energy_drink") {
      const amount = roundNumber <= 2 ? 7 : -7;
      modifier += amount;
      pushEffect(
        effects,
        side,
        `Alien Energy Drink: ${amount > 0 ? "+" : ""}${amount}`,
      );
    }
    if (
      gadgetId === "series_4_deatomizer" &&
      tactic === "blast" &&
      !usedTactic(priorRounds, side, "blast")
    ) {
      const amount = randomInt(0, 4) < 3 ? 18 : -12;
      modifier += amount;
      pushEffect(
        effects,
        side,
        `Series 4 De-Atomizer: ${amount > 0 ? "+" : ""}${amount}`,
      );
    }
    if (gadgetId === "worm_guy_burner_phone" && roundNumber === 3) {
      modifier += 12;
      pushEffect(effects, side, "Worm Guy Burner Phone: +12");
    }
    if (
      gadgetId === "lizard_skin_briefcase" &&
      ownerWins < opposingWins
    ) {
      modifier += 8;
      pushEffect(effects, side, "Lizard-Skin Briefcase: +8");
    }
    if (
      gadgetId === "swamp_gas_canister" &&
      tactic === opponentTacticValue
    ) {
      modifier += 10;
      pushEffect(effects, side, "Swamp-Gas Canister: +10");
    }
    if (gadgetId === "black_budget_tailored_suit") {
      modifier += 8;
      pushEffect(effects, side, "Black-Budget Tailored Suit: +8");
    }
    if (gadgetId === "artifact_orions_belt") {
      modifier += 15;
      pushEffect(effects, side, "Galaxy on Orion's Belt: +15");
    }
    if (gadgetId === "artifact_continuity_seal") {
      modifier += 10;
      pushEffect(effects, side, "Executive Continuity Seal: +10");
    }
    return modifier;
  };

  challengerGadgetModifier += applyNumericGadget(
    "challenger",
    challengerGadgetId,
    challengerTactic,
    opponentTactic,
    challengerRoundWins,
    opponentRoundWins,
  );
  opponentGadgetModifier += applyNumericGadget(
    "opponent",
    opponentGadgetId,
    opponentTactic,
    challengerTactic,
    opponentRoundWins,
    challengerRoundWins,
  );

  if (roundNumber === 1 && challengerGadgetId === "unlicensed_teleporter") {
    if (randomInt(0, 2) === 0) {
      challengerGadgetModifier += 12;
      pushEffect(effects, "challenger", "Unlicensed Teleporter: owner +12");
    } else {
      opponentGadgetModifier += 12;
      pushEffect(
        effects,
        "challenger",
        "Unlicensed Teleporter: opponent +12",
      );
      pushEffect(effects, "opponent", "Teleporter transfer: +12");
    }
  }
  if (roundNumber === 1 && opponentGadgetId === "unlicensed_teleporter") {
    if (randomInt(0, 2) === 0) {
      opponentGadgetModifier += 12;
      pushEffect(effects, "opponent", "Unlicensed Teleporter: owner +12");
    } else {
      challengerGadgetModifier += 12;
      pushEffect(
        effects,
        "opponent",
        "Unlicensed Teleporter: opponent +12",
      );
      pushEffect(effects, "challenger", "Teleporter transfer: +12");
    }
  }

  const tieRolls = [];

  while (
    challengerFinalRawRoll +
      challengerTacticBonus +
      challengerGadgetModifier ===
    opponentFinalRawRoll + opponentTacticBonus + opponentGadgetModifier
  ) {
    challengerFinalRawRoll = d100(randomInt);
    opponentFinalRawRoll = d100(randomInt);
    tieRolls.push({
      challenger: challengerFinalRawRoll,
      opponent: opponentFinalRawRoll,
    });
  }

  let challengerTotal =
    challengerFinalRawRoll +
    challengerTacticBonus +
    challengerGadgetModifier;
  let opponentTotal =
    opponentFinalRawRoll + opponentTacticBonus + opponentGadgetModifier;

  const rerollCloseLoss = (side, gadgetId) => {
    if (gadgetId !== "neuralyzer_mk_ii") {
      return false;
    }
    if (hasTriggered(priorRounds, side, "Neuralyzer Mk II")) {
      return false;
    }
    const ownerTotal =
      side === "challenger" ? challengerTotal : opponentTotal;
    const otherTotal =
      side === "challenger" ? opponentTotal : challengerTotal;
    if (ownerTotal >= otherTotal || otherTotal - ownerTotal > 10) {
      return false;
    }
    const previous =
      side === "challenger"
        ? challengerFinalRawRoll
        : opponentFinalRawRoll;
    const replacement = d100(randomInt);
    if (side === "challenger") {
      challengerFinalRawRoll = replacement;
      challengerTotal =
        replacement + challengerTacticBonus + challengerGadgetModifier;
    } else {
      opponentFinalRawRoll = replacement;
      opponentTotal =
        replacement + opponentTacticBonus + opponentGadgetModifier;
    }
    pushEffect(
      effects,
      side,
      `Neuralyzer Mk II: ${previous} → ${replacement}`,
    );
    return true;
  };
  rerollCloseLoss("challenger", challengerGadgetId);
  rerollCloseLoss("opponent", opponentGadgetId);

  while (challengerTotal === opponentTotal) {
    challengerFinalRawRoll = d100(randomInt);
    opponentFinalRawRoll = d100(randomInt);
    tieRolls.push({
      challenger: challengerFinalRawRoll,
      opponent: opponentFinalRawRoll,
    });
    challengerTotal =
      challengerFinalRawRoll +
      challengerTacticBonus +
      challengerGadgetModifier;
    opponentTotal =
      opponentFinalRawRoll + opponentTacticBonus + opponentGadgetModifier;
  }

  const replayOmegaLoss = (side, gadgetId) => {
    if (
      gadgetId !== "artifact_neuralyzer_omega" ||
      hasTriggered(priorRounds, side, "Neuralyzer Omega")
    ) {
      return false;
    }
    const lost =
      side === "challenger"
        ? challengerTotal < opponentTotal
        : opponentTotal < challengerTotal;
    if (!lost) {
      return false;
    }
    challengerFinalRawRoll = d100(randomInt);
    opponentFinalRawRoll = d100(randomInt);
    challengerTotal =
      challengerFinalRawRoll +
      challengerTacticBonus +
      challengerGadgetModifier;
    opponentTotal =
      opponentFinalRawRoll + opponentTacticBonus + opponentGadgetModifier;
    pushEffect(
      effects,
      side,
      "Neuralyzer Omega erased and replayed the lost round",
    );
    while (challengerTotal === opponentTotal) {
      challengerFinalRawRoll = d100(randomInt);
      opponentFinalRawRoll = d100(randomInt);
      tieRolls.push({
        challenger: challengerFinalRawRoll,
        opponent: opponentFinalRawRoll,
      });
      challengerTotal =
        challengerFinalRawRoll +
        challengerTacticBonus +
        challengerGadgetModifier;
      opponentTotal =
        opponentFinalRawRoll + opponentTacticBonus + opponentGadgetModifier;
    }
    return true;
  };
  replayOmegaLoss("challenger", challengerGadgetId);
  replayOmegaLoss("opponent", opponentGadgetId);

  const applyRedButton = (side, gadgetId) => {
    if (
      gadgetId !== "artifact_little_red_button" ||
      hasTriggered(priorRounds, side, "Little Red Button")
    ) {
      return;
    }
    const ownerTotal =
      side === "challenger" ? challengerTotal : opponentTotal;
    const otherTotal =
      side === "challenger" ? opponentTotal : challengerTotal;
    const gap = otherTotal - ownerTotal;
    if (gap <= 0 || gap > 50) {
      return;
    }
    const boost = gap + 1;
    if (side === "challenger") {
      challengerGadgetModifier += boost;
      challengerTotal += boost;
    } else {
      opponentGadgetModifier += boost;
      opponentTotal += boost;
    }
    pushEffect(
      effects,
      side,
      `Little Red Button: +${boost} (loss converted by one point)`,
    );
  };
  applyRedButton("challenger", challengerGadgetId);
  applyRedButton("opponent", opponentGadgetId);

  const winnerSide =
    challengerTotal > opponentTotal ? "challenger" : "opponent";
  const winningTactic =
    winnerSide === "challenger" ? challengerTactic : opponentTactic;
  const narrationPool = NARRATION_BY_TACTIC[winningTactic];
  const narrationId =
    narrationPool[randomInt(0, narrationPool.length)];

  return {
    challengerTactic,
    opponentTactic,
    challengerInitialRoll,
    opponentInitialRoll,
    challengerFinalRawRoll,
    opponentFinalRawRoll,
    challengerTacticBonus,
    opponentTacticBonus,
    challengerGadgetEffect: effects.challenger.join("; ") || null,
    opponentGadgetEffect: effects.opponent.join("; ") || null,
    challengerGadgetModifier,
    opponentGadgetModifier,
    challengerTotal,
    opponentTotal,
    tieRolls,
    winnerSide,
    narrationId,
  };
}

export function displayTactic(tactic) {
  if (tactic === "dirty_trick") {
    return "Dirty Trick";
  }
  return tactic[0].toUpperCase() + tactic.slice(1);
}
