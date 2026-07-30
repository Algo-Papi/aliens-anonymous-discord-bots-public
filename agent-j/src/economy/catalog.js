const item = (definition) => Object.freeze(definition);

export const GADGETS = Object.freeze([
  item({
    id: "noisy_cricket",
    name: "Noisy Cricket",
    price: 18,
    tier: "Field-Issue",
    description: "The owner's first Blast receives +10.",
  }),
  item({
    id: "pocket_shield_generator",
    name: "Pocket Shield Generator",
    price: 18,
    tier: "Field-Issue",
    description: "The owner's first Shield receives +10.",
  }),
  item({
    id: "cephalopod_ink_capsule",
    name: "Cephalopod Ink Capsule",
    price: 18,
    tier: "Field-Issue",
    description: "The owner's first Dirty Trick receives +10.",
  }),
  item({
    id: "neuralyzer",
    name: "Neuralyzer",
    price: 24,
    tier: "Field-Issue",
    description:
      "The owner's first raw roll of 25 or lower is rerolled once. The replacement is mandatory.",
  }),
  item({
    id: "alien_energy_drink",
    name: "Alien Energy Drink",
    price: 22,
    tier: "Field-Issue",
    description: "+7 in Rounds 1 and 2, then -7 in Round 3.",
  }),
  item({
    id: "unlicensed_teleporter",
    name: "Unlicensed Teleporter",
    price: 12,
    tier: "Field-Issue",
    description:
      "In Round 1 a public coin flip gives either its owner or the opponent +12.",
  }),
  item({
    id: "series_4_deatomizer",
    name: "Series 4 De-Atomizer",
    price: 28,
    tier: "Restricted",
    description:
      "The owner's first Blast has a 75% chance of +18 and a 25% chance of -12.",
  }),
  item({
    id: "fake_bureau_badge",
    name: "Fake Bureau Badge",
    price: 14,
    tier: "Restricted",
    description:
      "No combat effect. A ranked win receives +8 BC; a ranked loss receives no base loss payout.",
  }),
  item({
    id: "worm_guy_burner_phone",
    name: "Worm Guy Burner Phone",
    price: 55,
    tier: "Restricted",
    description: "+12 in Round 3. The Worm Guys do not answer early.",
  }),
  item({
    id: "lizard_skin_briefcase",
    name: "Lizard-Skin Briefcase",
    price: 70,
    tier: "Restricted",
    description: "+8 while its owner is behind in the match score.",
  }),
  item({
    id: "swamp_gas_canister",
    name: "Swamp-Gas Canister",
    price: 75,
    tier: "Restricted",
    description: "+10 whenever both fighters select the same tactic.",
  }),
  item({
    id: "questionably_licensed_deatomizer",
    name: "Questionably Licensed De-Atomizer",
    price: 110,
    tier: "Classified",
    description:
      "Blast's favorable bonus against Dirty Trick becomes +25 instead of +15.",
  }),
  item({
    id: "taxpayer_funded_force_field",
    name: "Taxpayer-Funded Force Field",
    price: 110,
    tier: "Classified",
    description:
      "Shield's favorable bonus against Blast becomes +25 instead of +15.",
  }),
  item({
    id: "evidence_locker_switcheroo",
    name: "Evidence-Locker Switcheroo",
    price: 110,
    tier: "Classified",
    description:
      "Dirty Trick's favorable bonus against Shield becomes +25 instead of +15.",
  }),
  item({
    id: "neuralyzer_mk_ii",
    name: "Neuralyzer Mk II",
    price: 160,
    tier: "Classified",
    description:
      "The owner's first round lost by 10 or less rerolls their raw d100 once.",
  }),
  item({
    id: "reverse_engineered_tic_tac_drive",
    name: "Reverse-Engineered Tic Tac Drive",
    price: 225,
    tier: "Blacksite",
    description:
      "Once per match, removes the opponent's +15 tactic bonus when the owner is countered.",
  }),
  item({
    id: "black_budget_tailored_suit",
    name: "Black-Budget Tailored Suit",
    price: 300,
    tier: "Blacksite",
    description: "A visible +8 to every round total.",
  }),
]);

export const CASE_THEMES = Object.freeze([
  item({
    id: "theme_redacted",
    name: "Redacted Case File",
    price: 250,
    tier: "Cosmetic",
    description: "Black-file headings, redaction marks, and a crimson accent.",
    color: 0xb3261e,
    heading: "M.I.B. REDACTED CASE",
    footer: "EYES ONLY // UNAUTHORIZED MEMORY SUBJECT TO REVISION",
  }),
  item({
    id: "theme_majestic_12",
    name: "Majestic-12",
    price: 400,
    tier: "Cosmetic",
    description: "A purple-and-gold MJ-12 case-file treatment.",
    color: 0x7e57c2,
    heading: "MAJESTIC-12 SPECIAL ACCESS FILE",
    footer: "MAJIC EYES ONLY // DENY ALL KNOWLEDGE",
  }),
  item({
    id: "theme_radioactive",
    name: "Radioactive Evidence",
    price: 300,
    tier: "Cosmetic",
    description: "Evidence-locker green with an avoidable safety warning.",
    color: 0x39d353,
    heading: "RADIOLOGICAL EVIDENCE FILE",
    footer: "DO NOT LICK THE CASE FILE",
  }),
]);

export const VICTORY_STAMPS = Object.freeze([
  item({
    id: "stamp_subject_contained",
    name: "SUBJECT CONTAINED",
    price: 100,
    tier: "Cosmetic",
    description: "A clean Bureau containment stamp.",
    text: "SUBJECT CONTAINED",
  }),
  item({
    id: "stamp_expense_denied",
    name: "EXPENSE REPORT DENIED",
    price: 125,
    tier: "Cosmetic",
    description: "For victories that will not be reimbursed.",
    text: "EXPENSE REPORT DENIED",
  }),
  item({
    id: "stamp_weather_balloon",
    name: "DEFINITELY NOT A WEATHER BALLOON",
    price: 200,
    tier: "Cosmetic",
    description: "Officially settles absolutely nothing.",
    text: "DEFINITELY NOT A WEATHER BALLOON",
  }),
]);

export const BROADCAST_PACKS = Object.freeze([
  item({
    id: "broadcast_bureau_hr",
    name: "Bureau HR",
    price: 450,
    tier: "Cosmetic",
    description: "Hostile human-resources commentary appended to round reports.",
  }),
  item({
    id: "broadcast_conspiracy_radio",
    name: "Conspiracy AM Radio",
    price: 500,
    tier: "Cosmetic",
    description: "Late-night disclosure broadcasting from an undisclosed van.",
  }),
  item({
    id: "broadcast_worm_guys",
    name: "Worm Guys Commentary",
    price: 600,
    tier: "Cosmetic",
    description: "Two Worm Guys, one microphone, no broadcast license.",
  }),
  item({
    id: "broadcast_uapgerb",
    name: "UAPGerb Remote Correspondent",
    price: 650,
    tier: "Cosmetic",
    description: "Three enhanced pixels and an irresponsible tactical conclusion.",
  }),
]);

export const ARTIFACTS = Object.freeze([
  item({
    id: "artifact_orions_belt",
    name: "The Galaxy on Orion's Belt",
    price: 2_500,
    activationPrice: 75,
    tier: "Omega Artifact",
    description: "Adds +15 to every round.",
  }),
  item({
    id: "artifact_neuralyzer_omega",
    name: "Neuralyzer Omega",
    price: 4_000,
    activationPrice: 100,
    tier: "Omega Artifact",
    description:
      "The owner's first lost round is automatically replayed with the same tactics and fresh rolls.",
  }),
  item({
    id: "artifact_little_red_button",
    name: "Little Red Button",
    price: 5_000,
    activationPrice: 125,
    tier: "Cosmic Contraband",
    description:
      "The owner's first loss by 50 or less is converted into a win by one point.",
  }),
  item({
    id: "artifact_continuity_seal",
    name: "Executive Continuity Seal",
    price: 6_666,
    activationPrice: 150,
    tier: "Cosmic Contraband",
    description:
      "The owner begins 1-0 and receives +10 in every remaining round.",
  }),
]);

export const ALL_ITEMS = Object.freeze([
  ...GADGETS.map((entry) => item({ ...entry, kind: "gadget" })),
  ...CASE_THEMES.map((entry) => item({ ...entry, kind: "theme" })),
  ...VICTORY_STAMPS.map((entry) => item({ ...entry, kind: "stamp" })),
  ...BROADCAST_PACKS.map((entry) =>
    item({ ...entry, kind: "broadcast" }),
  ),
  ...ARTIFACTS.map((entry) => item({ ...entry, kind: "artifact" })),
]);

const BY_ID = new Map(ALL_ITEMS.map((entry) => [entry.id, entry]));

export function getItem(itemId) {
  return BY_ID.get(itemId) ?? null;
}

export function itemsByKind(kind) {
  return ALL_ITEMS.filter((entry) => entry.kind === kind);
}

export function isGadget(itemId) {
  return getItem(itemId)?.kind === "gadget";
}

export function isArtifact(itemId) {
  return getItem(itemId)?.kind === "artifact";
}

export const DEFAULT_COSMETICS = Object.freeze({
  theme: null,
  stamp: null,
  broadcast: null,
});
