function variants(familyId, slot, values) {
  return values.map(([id, text]) => ({
    id: `${familyId}-${slot}-${id}`,
    text,
  }));
}

function observations(familyId, values) {
  return values.map(([id, template]) => ({
    id: `${familyId}-observation-${id}`,
    template,
    placeholders: ["witness", "target"],
  }));
}

function scenario({
  id,
  label,
  premise,
  species,
  origins,
  anomalies,
  threatLabels,
  weaknesses,
  dispositions,
  observationTemplates,
}) {
  return {
    id,
    label,
    premise,
    species: variants(id, "species", species),
    origins: variants(id, "origin", origins),
    anomalies: variants(id, "anomaly", anomalies),
    threatLabels: variants(id, "threat", threatLabels),
    weaknesses: variants(id, "weakness", weaknesses),
    dispositions: variants(id, "disposition", dispositions),
    observations: observations(id, observationTemplates),
  };
}

function deepFreeze(value) {
  Object.freeze(value);
  for (const nested of Object.values(value)) {
    if (
      nested !== null &&
      typeof nested === "object" &&
      !Object.isFrozen(nested)
    ) {
      deepFreeze(nested);
    }
  }
  return value;
}

export const SCAN_SCENARIOS = deepFreeze([
  scenario({
    id: "counterfeit-human",
    label: "Counterfeit human / bad disguise",
    premise:
      "A bargain-bin alien is impersonating a human with defective disguise hardware.",
    species: [
      ["discount-replica", "Discount Human Replica"],
      ["latex-civilian", "Latex-Based Civilian"],
      ["trench-coat-consortium", "Three Bureau Props Sharing One Trench Coat"],
      ["mall-kiosk-person", "Mall-Kiosk Person With Optional Eyebrows"],
    ],
    origins: [
      [
        "shuttered-disguise-kiosk",
        "a shuttered human-disguise kiosk behind the Bureau motor pool",
      ],
      [
        "witness-catalog",
        "a fulfillment warehouse for an off-brand witness-protection catalog whose models have no faces",
      ],
      [
        "human-enough-warehouse",
        "a warehouse stamped HUMAN ENOUGH FOR WEEKENDS",
      ],
      [
        "customs-reject-bin",
        "the customs reject bin at an interplanetary costume depot",
      ],
    ],
    anomalies: [
      [
        "ear-zipper",
        "a zipper behind the left ear that opens directly into packing peanuts",
      ],
      [
        "duplicate-fingerprints",
        "ten identical fingerprints printed slightly off-center",
      ],
      [
        "motion-sensor-blink",
        "a blink cycle activated only by nearby motion sensors",
      ],
      [
        "receipt-skeleton",
        "a coat-hanger skeleton bent into a roughly anatomical arrangement",
      ],
    ],
    threatLabels: [
      [
        "conversation-collapse",
        "Low Threat; Catastrophic in a Normal Conversation",
      ],
      [
        "disguise-failure",
        "Containable Until the Face Adhesive Reaches Room Temperature",
      ],
      [
        "mall-security",
        "Moderate Risk to Mall Security and the Concept of Eye Contact",
      ],
      [
        "humanity-audit",
        "One Follow-Up Question Away From a Full Humanity Audit",
      ],
    ],
    weaknesses: [
      [
        "childhood-small-talk",
        "small talk requiring a verifiable childhood memory",
      ],
      ["warm-room", "any room warm enough to loosen industrial face glue"],
      [
        "traffic-light-captcha",
        "a traffic-light captcha administered without alien assistance",
      ],
      [
        "sneeze-request",
        "being asked to sneeze without consulting the instruction card",
      ],
    ],
    dispositions: [
      [
        "return-disguise-desk",
        "Return to the disguise desk; deny the refund and keep the receipt as evidence.",
      ],
      [
        "supervised-humanity",
        "Approve supervised humanity until the subject can blink without buffering.",
      ],
      [
        "seasonal-decoration",
        "Reclassify as a department-store mannequin and keep away from direct heat.",
      ],
      [
        "practice-face",
        "Issue a practice face and restrict public use to poorly lit parking lots.",
      ],
    ],
    observationTemplates: [
      [
        "microwave-face",
        "{witness} reported {target} after the subject reheated its face in a break-room microwave and put both eyebrows back on the same side.",
      ],
      [
        "elbow-handshake",
        "Bureau footage shows {target} greeting {witness} by extending an elbow; when challenged, the subject checked a pocket card labeled HOW HANDS WORK.",
      ],
      [
        "laugh-track",
        "{witness} became suspicious when {target} played a canned laugh from inside its rib cage four seconds after everyone else had stopped.",
      ],
      [
        "rain-delay",
        "Agent J opened a disguise case after {witness} watched {target}'s nose slide into its collar during light rain.",
      ],
    ],
  }),
  scenario({
    id: "recalled-bureau-prototype",
    label: "Recalled Bureau prototype",
    premise:
      "A discontinued Bureau field prototype escaped quality assurance with every known defect intact.",
    species: [
      ["combat-model", "Recalled Bureau Combat Prototype"],
      ["preproduction-human", "Preproduction Human With Debug Ports"],
      ["field-test-organism", "Field-Test Organism, Warranty Voided"],
      ["government-beta", "Government-Issue Beta Person"],
    ],
    origins: [
      [
        "sublevel-r-and-d",
        "Sublevel R&D, two doors past the lab that officially burned down",
      ],
      [
        "procurement-pilot",
        "a Bureau warehouse holding three prototypes Procurement bought before anyone approved the project",
      ],
      [
        "prototype-cage",
        "the prototype cage Agent J was specifically told not to open",
      ],
      [
        "fiscal-year-lab",
        "a Bureau laboratory built entirely from unused fiscal-year money",
      ],
    ],
    anomalies: [
      [
        "emergency-off-switch",
        "an emergency off switch positioned where the subject can lean on it",
      ],
      [
        "kneecap-status-lights",
        "kneecaps that flash red whenever the warranty department is mentioned",
      ],
      [
        "debug-mouth",
        "a mouth that announces internal error codes before every bad decision",
      ],
      [
        "serial-number-spine",
        "a spine bearing three crossed-out serial numbers and a yard-sale sticker",
      ],
    ],
    threatLabels: [
      [
        "obsolete-firepower",
        "Obsolete Firepower With Current Ammunition",
      ],
      [
        "patch-pending",
        "Severe Until the Mandatory Firmware Patch Stops Failing",
      ],
      [
        "workplace-incident",
        "One Loose Screw From a Bureau-Wide Workplace Incident",
      ],
      [
        "budget-weapon",
        "High Threat, Provided Nobody Asks What It Cost",
      ],
    ],
    weaknesses: [
      ["firmware-progress", "a firmware update frozen at ninety-nine percent"],
      [
        "final-inspection-clipboard",
        "any clipboard marked FINAL INSPECTION",
      ],
      [
        "warranty-question",
        'the question, "Is this still under warranty?"',
      ],
      [
        "factory-reset",
        "holding both ears for ten seconds to trigger a factory reset",
      ],
    ],
    dispositions: [
      [
        "return-r-and-d",
        "Return to R&D in the original crate and pretend nobody saw the mileage.",
      ],
      [
        "museum-display",
        "Drain the ammunition and display beside other expensive Bureau mistakes.",
      ],
      [
        "desk-duty",
        "Restrict to desk duty until its knees stop broadcasting diagnostics.",
      ],
      [
        "parts-inventory",
        "Decommission carefully; Procurement already sold half the replacement parts.",
      ],
    ],
    observationTemplates: [
      [
        "coffee-defense-mode",
        "{witness} offered {target} coffee, activating a defense mode that subdued the copier and filed it as an enemy combatant.",
      ],
      [
        "stairs-reboot",
        "Bureau cameras recorded {target} climbing two stairs, rebooting, and asking {witness} to accept an eighteen-page license agreement.",
      ],
      [
        "sneeze-ammunition",
        "{witness} called Agent J after {target} sneezed, ejected a full magazine, and calmly announced that the feature was working as designed.",
      ],
      [
        "inspection-panic",
        "{target} mistook a grocery list carried by {witness} for an inspection form and attempted to escape through a wall the prototype manual identifies as structural.",
      ],
    ],
  }),
  scenario({
    id: "botched-abduction-return",
    label: "Botched abduction return",
    premise:
      "An abductee was returned by careless extraterrestrials with parts misplaced and customer service unresolved.",
    species: [
      ["reassembled-abductee", "Improperly Reassembled Abductee"],
      ["grey-repaired-civilian", "Grey-Repaired Civilian"],
      ["post-abduction-floor-model", "Post-Abduction Floor Model"],
      ["return-lane-survivor", "Roadside Return-Lane Survivor"],
    ],
    origins: [
      [
        "roadside-drop-zone",
        "an unmarked roadside drop zone with a one-star customer rating",
      ],
      [
        "grey-service-bay",
        "a Grey service bay that lost the assembly diagram",
      ],
      [
        "mothership-returns",
        "the mothership returns counter five minutes before closing",
      ],
      [
        "tractor-beam-claim",
        "a disputed tractor-beam claim outside county jurisdiction",
      ],
    ],
    anomalies: [
      [
        "kidney-luggage-tag",
        "a kidney attached outside the body with a matching luggage tag",
      ],
      [
        "reversed-elbows",
        "both elbows reinstalled backward but polished to a professional shine",
      ],
      [
        "spare-navel",
        "a spare navel taped beneath the chin with alien masking tape",
      ],
      [
        "rib-cage-receipt",
        "a rib cage containing the receipt for three organs the subject never ordered",
      ],
    ],
    threatLabels: [
      [
        "low-intent-high-leakage",
        "Low Hostile Intent; Significant Fluid-Containment Concerns",
      ],
      [
        "parts-discrepancy",
        "Moderate Threat Caused Entirely by Parts-Placement Discrepancies",
      ],
      [
        "pickup-pending",
        "Harmless Unless the Retrieval Crew Comes Back Angry",
      ],
      [
        "warranty-dispute",
        "Escalating Warranty Dispute in a Human-Shaped Package",
      ],
    ],
    weaknesses: [
      [
        "mothership-hold-music",
        "mothership customer-service hold music that snaps every misplaced organ back into its trauma position",
      ],
      [
        "pickup-penlight",
        "a bright penlight mistaken for the return crew's pickup signal",
      ],
      [
        "satisfaction-survey",
        "a customer-satisfaction survey, which triggers immediate shutdown before the probe section",
      ],
      [
        "assembly-diagram",
        "the original assembly diagram, which makes every misplaced organ report itself",
      ],
    ],
    dispositions: [
      [
        "grey-roadside-assistance",
        "Call Grey roadside assistance and refuse to authorize another complimentary probe.",
      ],
      [
        "match-serials",
        "Hold in soft quarantine until every organ matches a serial number.",
      ],
      [
        "return-with-photos",
        "Return to the mothership with photographs; Legal says not to sign anything.",
      ],
      [
        "release-with-manual",
        "Release with an anatomy manual, a staple remover, and Bureau towing coverage.",
      ],
    ],
    observationTemplates: [
      [
        "ear-cough",
        "{witness} called the Bureau after {target} coughed through an ear and produced a return receipt for the missing mouth.",
      ],
      [
        "magnet-organ-shift",
        "During lunch with {witness}, {target} stood beside a refrigerator magnet and every recently installed organ shifted six inches north.",
      ],
      [
        "survey-printer",
        "{witness} watched {target}'s shoulder print an alien satisfaction survey each time the subject complained about lower-back probing.",
      ],
      [
        "headlight-pickup",
        "When {witness} arrived by car, {target} mistook the headlights for the retrieval craft and lay beside the curb with the warranty paperwork displayed.",
      ],
    ],
  }),
  scenario({
    id: "attention-seeking-cryptid",
    label: "Attention-seeking cryptid",
    premise:
      "A cryptid is manufacturing public sightings because natural terror no longer satisfies its engagement metrics.",
    species: [
      ["content-creator", "Content-Creator Cryptid"],
      ["ring-light-moth", "Ring-Light Moth Thing"],
      ["sponsored-omen", "Sponsored Forest Omen"],
      ["algorithmic-bigfoot", "Algorithmically Optimized Bigfoot"],
    ],
    origins: [
      [
        "influencer-cave",
        "an influencer cave with fiber internet and no natural predators",
      ],
      [
        "tourist-trap",
        "an abandoned roadside attraction still desperate for foot traffic",
      ],
      [
        "engagement-swamp",
        "a swamp where every scream is measured against last quarter",
      ],
      [
        "content-incubator",
        "a venture-funded cryptid incubator beneath a national forest",
      ],
    ],
    anomalies: [
      [
        "ring-light-irises",
        "ring-light irises that activate whenever a phone turns vertical",
      ],
      [
        "qr-code-pelt",
        "a pelt that grows a fresh sponsorship QR code every morning",
      ],
      [
        "thumbnail-jaw",
        "a jaw that unhinges only when someone frames a dramatic thumbnail",
      ],
      [
        "analytics-gland",
        "an analytics gland that swells whenever strangers argue in the comments",
      ],
    ],
    threatLabels: [
      [
        "engagement-predator",
        "Engagement Predator With a Sponsored Containment Breach",
      ],
      [
        "viral-by-sundown",
        "Physically Minor; Determined to Be Viral by Sundown",
      ],
      [
        "publicity-omen",
        "Regional Publicity Omen With Access to Editing Software",
      ],
      [
        "camera-dependent",
        "High Drama, Low Danger, Completely Camera-Dependent",
      ],
    ],
    weaknesses: [
      ["camera-off", "a camera pointed elsewhere"],
      [
        "two-like-post",
        "a carefully staged sighting receiving exactly two likes",
      ],
      [
        "unskippable-ad",
        "an unskippable advertisement for another cryptid",
      ],
      [
        "no-signal",
        "three consecutive minutes without cellular service",
      ],
    ],
    dispositions: [
      [
        "demonetize-relocate",
        "Demonetize and relocate to a dead mall beyond cellular coverage.",
      ],
      [
        "licensed-sightings",
        "Permit one licensed sighting per quarter with comments disabled.",
      ],
      [
        "blur-duty",
        "Assign to Bureau blur duty; the subject already knows every bad camera angle.",
      ],
      [
        "sponsor-ban",
        "Confiscate the ring light and ban sponsorships involving livestock.",
      ],
    ],
    observationTemplates: [
      [
        "third-take",
        "{witness} discovered {target} restaging the same terrifying forest entrance because the first two screams lacked usable audio.",
      ],
      [
        "sponsor-read",
        "Bureau surveillance caught {target} chasing {witness} through the woods, pausing midway to finish a sponsor read for tactical jerky.",
      ],
      [
        "thumbnail-rescue",
        "{target} allowed {witness} to escape after realizing the rescue footage produced a stronger thumbnail than the attack.",
      ],
      [
        "ring-light-track",
        "{witness} located {target}'s supposedly hidden lair by following extension cords from the forest to a stolen ring light.",
      ],
    ],
  }),
  scenario({
    id: "timeline-duplicate",
    label: "Timeline duplicate",
    premise:
      "A duplicate from a damaged timeline is competing with the original for one identity, one alibi, and one parking space.",
    species: [
      ["tomorrow-copy", "Tomorrow's Unlicensed Duplicate"],
      ["continuity-human", "Continuity-Error Human"],
      ["paradox-backup", "Paradox Backup Copy"],
      ["alternate-timeline-spare", "Alternate-Timeline Spare Person"],
    ],
    origins: [
      [
        "discarded-tuesday",
        "a discarded Tuesday the Bureau forgot to erase",
      ],
      [
        "failed-branch",
        "a failed timeline branch where the subject made one competent decision",
      ],
      [
        "future-copy-room",
        "the future copy room after somebody selected COLLATE IDENTITIES",
      ],
      [
        "paradox-lost-and-found",
        "the paradox lost-and-found, six hours from now",
      ],
    ],
    anomalies: [
      [
        "early-shadow",
        "a shadow that arrives eleven seconds before the rest of the body",
      ],
      [
        "migrating-scar",
        "a scar that changes location whenever yesterday is discussed",
      ],
      [
        "tomorrow-pulse",
        "a pulse consistently dated tomorrow",
      ],
      [
        "duplicate-navel",
        "two navels, each claiming the other one is the copy",
      ],
    ],
    threatLabels: [
      [
        "alibi-paradox",
        "Moderate Paradox; Chronically Early to Its Own Alibi",
      ],
      [
        "identity-collision",
        "Low Violence, Imminent Identity Collision",
      ],
      [
        "continuity-damage",
        "Severe Continuity Damage in a Familiar Outfit",
      ],
      [
        "two-subject-limit",
        "Stable Until Both Versions Enter the Same Group Chat",
      ],
    ],
    weaknesses: [
      [
        "restaurant-bill",
        "being asked which version paid the restaurant bill",
      ],
      ["synchronized-clocks", "two clocks agreeing in the same room"],
      [
        "original-receipt",
        "the original subject arriving with a dated receipt",
      ],
      [
        "calendar-invite",
        "a calendar invitation that exists in only one timeline",
      ],
    ],
    dispositions: [
      [
        "different-haircut",
        "Issue the duplicate a different haircut and a legally distinct birthday.",
      ],
      [
        "merge-after-backup",
        "Merge timelines only after backing up both personalities and whichever one remembers the password.",
      ],
      [
        "future-custody",
        "Hold until the future arrives to claim its property.",
      ],
      [
        "alternate-weekends",
        "Grant the identity on alternate weekends and split the parking citations.",
      ],
    ],
    observationTemplates: [
      [
        "borrowed-alibi",
        "{witness} saw {target} arguing with tomorrow's duplicate over who had already used the good alibi.",
      ],
      [
        "late-warning",
        "{target} warned {witness} not to open the supply closet, then emerged from it five minutes later to complain that the warning came too late.",
      ],
      [
        "parking-loop",
        "Bureau cameras show {witness} yielding one parking space to three versions of {target}, each arriving to prevent the previous version from taking it.",
      ],
      [
        "future-apology",
        "{witness} received an apology from {target} for an incident scheduled next Thursday; the incident occurred early out of spite.",
      ],
    ],
  }),
  scenario({
    id: "diplomatic-pest",
    label: "Diplomatic pest",
    premise:
      "A minor extraterrestrial official is abusing diplomatic immunity to turn petty misconduct into an interstellar incident.",
    species: [
      ["minor-moon-attache", "Minor-Moon Attaché"],
      ["embassy-nuisance", "Embassy-Grade Nuisance"],
      ["cultural-exchange-pest", "Interstellar Cultural-Exchange Pest"],
      ["consular-parasite", "Consular Parasite With Temporary Plates"],
    ],
    origins: [
      [
        "broom-closet-embassy",
        "an embassy operating from a broom closet with disputed borders",
      ],
      [
        "minor-moon-consulate",
        "the consulate of a minor moon nobody remembers recognizing",
      ],
      [
        "airport-lounge-state",
        "a sovereign airport lounge currently at war with its own minibar",
      ],
      [
        "trade-delegation",
        "a trade delegation that arrived with samples and never left",
      ],
    ],
    anomalies: [
      [
        "passport-tongue",
        "a tongue that stamps its own passport during arguments",
      ],
      [
        "protest-pockets",
        "coat pockets that secrete formal protests when searched",
      ],
      [
        "immunity-chip",
        "a diplomatic-immunity chip implanted where a conscience was expected",
      ],
      [
        "anthem-spine",
        "a spine that plays the national anthem whenever the bill arrives",
      ],
    ],
    threatLabels: [
      [
        "minibar-crisis",
        "Low Military Risk; Active Minibar Crisis",
      ],
      [
        "paperwork-retaliation",
        "Capable of Retaliation Through Extremely Petty Paperwork",
      ],
      [
        "parking-war",
        "One Parking Citation From Interplanetary War",
      ],
      [
        "protocol-emergency",
        "Contained Diplomatic Emergency With an Open Tab",
      ],
    ],
    weaknesses: [
      ["itemized-minibar", "an itemized minibar invoice"],
      [
        "protocol-officer",
        "a protocol officer who has read the entire treaty",
      ],
      [
        "duplicate-customs-form",
        "a customs declaration required in duplicate",
      ],
      [
        "validated-parking",
        "being informed that diplomatic parking still requires validation",
      ],
    ],
    dispositions: [
      [
        "broom-closet-sovereignty",
        "Recognize sovereignty only inside the embassy broom closet and lock the minibar.",
      ],
      [
        "baggage-carousel",
        "Return the subject to its airport-lounge consulate on the baggage carousel; refreshments are not reimbursable.",
      ],
      [
        "immunity-probation",
        "Place diplomatic immunity on probation pending one correctly completed form.",
      ],
      [
        "food-court-exile",
        "Exile to the food court under a treaty nobody intends to translate.",
      ],
    ],
    observationTemplates: [
      [
        "buffet-annexation",
        "{witness} contacted Agent J after {target} annexed the breakfast buffet and declared the waffle maker a strategic asset.",
      ],
      [
        "parking-sanctions",
        "{target} parked across three spaces, presented {witness} with a treaty written on a cocktail napkin, and threatened sanctions against the towing company.",
      ],
      [
        "minibar-hearing",
        "At a formal hearing, {witness} produced the minibar invoice and {target}'s diplomatic anthem immediately slowed to half speed.",
      ],
      [
        "gift-shop-border",
        "{witness} crossed an embassy border accidentally when {target} moved the border tape through a gift shop to avoid paying for sunglasses.",
      ],
    ],
  }),
]);
