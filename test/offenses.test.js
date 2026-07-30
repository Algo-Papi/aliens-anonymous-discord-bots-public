import assert from "node:assert/strict";
import test from "node:test";

import { getOffenseOptions, OFFENSES, pickOffense } from "../src/offenses.js";

test("low-altitude catalog contains 24 unique charges and sentences", () => {
  const offense = OFFENSES.low_altitude;

  assert.equal(offense.charges.length, 24);
  assert.equal(new Set(offense.charges).size, 24);
  assert.equal(offense.sentences.length, 24);
  assert.equal(new Set(offense.sentences).size, 24);
  assert.doesNotMatch(offense.footer, /no actual moderation action/i);
});

test("charge and sentence are selected independently", () => {
  const indexes = [4, 1];
  const result = pickOffense("low_altitude", () => indexes.shift());

  assert.equal(result.charge, "Trafficking in low-hanging fruit");
  assert.equal(result.sentence, "One mandatory booster-seat inspection");
});

test("berberphobia catalog contains 20 independently randomized charges and sentences", () => {
  const offense = OFFENSES.berberphobia;

  assert.equal(offense.charges.length, 20);
  assert.equal(new Set(offense.charges).size, 20);
  assert.equal(offense.sentences.length, 20);
  assert.equal(new Set(offense.sentences).size, 20);

  const indexes = [8, 18];
  const result = pickOffense("berberphobia", () => indexes.shift());

  assert.equal(
    result.charge,
    "Attempted racism enhanced by room-temperature intelligence",
  );
  assert.equal(
    result.sentence,
    "Sentenced to lose an argument against a museum placard",
  );
});

test("minority-violation catalog satirizes the offender with independent pools", () => {
  const offense = OFFENSES.minority_violation;

  assert.equal(offense.menuLabel, "Aggravated Minority Violation");
  assert.equal(offense.charges.length, 20);
  assert.equal(new Set(offense.charges).size, 20);
  assert.equal(offense.sentences.length, 20);
  assert.equal(new Set(offense.sentences).size, 20);
  assert.equal(offense.findings.length, 10);
  assert.equal(new Set(offense.findings).size, 10);

  const indexes = [4, 13, 1];
  const result = pickOffense("minority_violation", () => indexes.shift());

  assert.equal(
    result.charge,
    "Demanding federal obedience while brandishing a cafeteria monitor badge",
  );
  assert.equal(
    result.sentence,
    "Every claim of reverse oppression accompanied by the world's smallest government-issued violin",
  );
  assert.equal(
    result.finding,
    "No minority violation was detected; the subject merely encountered a minority.",
  );
});

test("brosexual catalog contains 20 independently randomized charges and sentences", () => {
  const offense = OFFENSES.brosexual;

  assert.equal(offense.charges.length, 20);
  assert.equal(new Set(offense.charges).size, 20);
  assert.equal(offense.sentences.length, 20);
  assert.equal(new Set(offense.sentences).size, 20);

  const indexes = [18, 15];
  const result = pickOffense("brosexual", () => indexes.shift());

  assert.equal(
    result.charge,
    "Winning gay chicken by refusing to acknowledge that the game ended forty minutes ago",
  );
  assert.equal(
    result.sentence,
    "Sentenced to ninety days as the government's least convincing heterosexual informant",
  );
});

test("hornyposting catalog independently mixes 20 charges, 20 sentences, and 10 findings", () => {
  const offense = OFFENSES.hornyposting;

  assert.equal(offense.menuLabel, "Aggravated Hornyposting");
  assert.equal(offense.charges.length, 20);
  assert.equal(new Set(offense.charges).size, 20);
  assert.equal(offense.sentences.length, 20);
  assert.equal(new Set(offense.sentences).size, 20);
  assert.equal(offense.findings.length, 10);
  assert.equal(new Set(offense.findings).size, 10);

  const indexes = [4, 12, 8];
  const result = pickOffense("hornyposting", () => indexes.shift());

  assert.equal(
    result.charge,
    "Requesting an alien probe with detectable enthusiasm",
  );
  assert.equal(
    result.sentence,
    "Thirst confiscated, vacuum-sealed, and stored in Area 51 beside the Ark and several cursed body pillows",
  );
  assert.equal(
    result.finding,
    "The horny detector exceeded its design limit, caught fire, and filed for workers' compensation.",
  );
});

test("new Bureau catalogs contain 10 unique charges, sentences, and findings", () => {
  const expected = {
    gross_incompetence: "Gross Cognitive Negligence",
    aggravated_cowardice: "Aggravated Pussy Conduct",
    weaponized_pedantry: "Weaponized Pedantry",
    meme_malpractice: "Aggravated Meme Malpractice",
  };

  for (const [offenseId, menuLabel] of Object.entries(expected)) {
    const offense = OFFENSES[offenseId];

    assert.ok(offense);
    assert.equal(offense.menuLabel, menuLabel);
    assert.equal(offense.charges.length, 10);
    assert.equal(new Set(offense.charges).size, 10);
    assert.equal(offense.sentences.length, 10);
    assert.equal(new Set(offense.sentences).size, 10);
    assert.equal(offense.findings.length, 10);
    assert.equal(new Set(offense.findings).size, 10);
    assert.doesNotMatch(offense.footer, /no actual moderation action/i);
  }
});

test("new Bureau charge, sentence, and finding banks are selected independently", () => {
  const indexes = [2, 4, 7];
  const result = pickOffense("gross_incompetence", () => indexes.shift());

  assert.equal(
    result.charge,
    "Transporting a bad take across state and dimensional lines with intent to distribute",
  );
  assert.equal(
    result.sentence,
    "Two hundred hours sorting evidence into OBVIOUS and SOMEHOW STILL MISSED IT",
  );
  assert.equal(
    result.finding,
    "Confidence tested at 98 percent; comprehension returned trace amounts.",
  );
});

test("each offense becomes a picker option", () => {
  const options = getOffenseOptions();

  assert.equal(options.length, Object.keys(OFFENSES).length);
  assert.deepEqual(options[0], {
    label: "Low-Altitude Hostility",
    description: "Height jokes and compact-command insubordination.",
    emoji: "🛸",
    value: "low_altitude",
  });
  assert.deepEqual(options[1], {
    label: "Aggravated Berberphobic Conduct",
    description: "Anti-Amazigh hostility and culturally hostile dumbassery.",
    emoji: "⚖️",
    value: "berberphobia",
  });
  assert.deepEqual(options[2], {
    label: "Aggravated Minority Violation",
    description:
      "Civil-rights panic, demographic meltdowns, and counterfeit supremacy.",
    emoji: "🚫",
    value: "minority_violation",
  });
  assert.deepEqual(options[3], {
    label: "Aggravated Brosexual Conduct",
    description:
      "Felony-grade sus behavior and catastrophically failed denials.",
    emoji: "🤨",
    value: "brosexual",
  });
  assert.deepEqual(options[4], {
    label: "Aggravated Hornyposting",
    description:
      "Unlicensed thirst, pervert behavior, and catastrophic zipper discipline.",
    emoji: "🥵",
    value: "hornyposting",
  });
  assert.deepEqual(
    options.map((option) => option.value),
    [
      "low_altitude",
      "berberphobia",
      "minority_violation",
      "brosexual",
      "hornyposting",
      "gross_incompetence",
      "aggravated_cowardice",
      "weaponized_pedantry",
      "meme_malpractice",
    ],
  );
});

test("every picker option and generated line fits Discord's limits", () => {
  const options = getOffenseOptions();

  assert.ok(options.length <= 25);
  for (const option of options) {
    assert.ok(option.label.length >= 1 && option.label.length <= 100);
    assert.ok(
      option.description.length >= 1 && option.description.length <= 100,
    );
    assert.ok(option.value.length >= 1 && option.value.length <= 100);
  }

  for (const offense of Object.values(OFFENSES)) {
    assert.ok(offense.heading.length <= 256);
    assert.ok(offense.footer.length <= 2_048);
    for (const line of [
      ...offense.charges,
      ...offense.sentences,
      ...(offense.findings ?? []),
    ]) {
      assert.ok(line.length <= 1_024);
    }
  }
});
