function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value;
}

const scenarios = [
  {
    id: "abduction",
    periods: [
      "the night your missing time acquired a medical copay",
      "the Thursday a tractor beam collected you from the drive-through",
      "the final hour of an unauthorized orbital examination",
      "the weekend your alibi was admitted to alien urgent care",
    ],
    locations: [
      "an examination bay aboard a saucer with expired plates",
      "the livestock intake deck of a Grey medical shuttle",
      "a zero-gravity clinic parked above the county line",
      "the recovery ward behind an interstellar truck stop",
    ],
    reasons: [
      "the examination revealed that your confidence was the only enlarged organ",
      "the Grey medical board refused to explain why the probe requested hazard pay",
      "you heard the surgical team draw straws before opening the gown",
      "the crew's first-contact report recommended quarantining your entire browser history",
    ],
    evidenceItems: [
      "the itemized copay for one abduction and two professional apologies",
      "a bent examination probe carrying a handwritten resignation",
      "an orbital X-ray showing a parking ticket where your dignity should be",
      "an alien discharge bracelet listing your species as disputed",
    ],
    residualSymptoms: [
      "Your medical insurance keeps denying claims filed from low orbit.",
      "Your left hip now points toward the nearest functioning tractor beam.",
      "You freeze whenever overhead lighting asks you to undress.",
      "Your pulse spikes whenever a browser asks to remember your history.",
    ],
    treatments: [
      "Dispute the orbital copay before collections repossess your remaining dignity.",
      "Avoid open fields until the probe finishes its workers' compensation claim.",
      "Report to Agent J if the examination scar requests a second opinion.",
      "Clear your browser history before the crew schedules a follow-up examination.",
    ],
  },
  {
    id: "childhood",
    periods: [
      "the school year your field trip required diplomatic immunity",
      "your undocumented third-grade science fair",
      "the recess when the class pet requested asylum",
      "the summer your report card was sealed by Congress",
    ],
    locations: [
      "the portable classroom behind a disguised launch silo",
      "the science-fair gym after federal agents locked the exits",
      "a school basement labeled advanced livestock studies",
      "the nurse's office beneath an active landing pad",
    ],
    reasons: [
      "the field-trip bus followed a weather balloon into restricted airspace",
      "your baking-soda volcano opened a stable portal to detention",
      "the class pet identified you as its commanding officer",
      "the school board could not admit that your imaginary friend held diplomatic rank",
    ],
    evidenceItems: [
      "a class photo with an evidence marker where you should be",
      "the science-fair ribbon awarded for accidental first contact",
      "a permission slip signed by the class pet's embassy",
      "the report card that grades your species as still developing",
    ],
    residualSymptoms: [
      "You raise your hand whenever a weather balloon appears overhead.",
      "Your handwriting reverts to crayon during security briefings.",
      "You become suspicious when a class pet knows parliamentary procedure.",
      "Your inner child still carries a federal visitor badge.",
    ],
    treatments: [
      "Ask Agent J to sign the field-trip form before entering restricted airspace again.",
      "Keep crayons away from science projects, portals, and legally binding documents.",
      "Return the class pet to its embassy before the next parent conference.",
      "Repeat third grade without accepting credentials from imaginary diplomats.",
    ],
  },
  {
    id: "missing-weekend",
    periods: [
      "the forty-eight hours between Friday's stolen sedan and Monday's federal apology",
      "the weekend your emergency contact changed planets",
      "the holiday weekend the Bureau billed as a containment event",
      "the Sunday morning that arrived without you",
    ],
    locations: [
      "the back seat of a Bureau sedan crossing three timelines",
      "an orbital casino operating beyond the reach of good judgment",
      "the livestock tribunal behind an alien karaoke bar",
      "a Martian motel that charged emotional damages by the hour",
    ],
    reasons: [
      "the stolen sedan returned with a clone in the passenger seat",
      "you wagered Earth during a card game and nearly accepted store credit",
      "your karaoke performance triggered a diplomatic evacuation",
      "the motel footage showed you checking out before you arrived",
    ],
    evidenceItems: [
      "the Bureau sedan's receipt for three timelines and one drive-through",
      "a casino marker using Earth as collateral",
      "the alien wedding ring you insist was part of the karaoke package",
      "a Martian room key stamped with tomorrow's checkout time",
    ],
    residualSymptoms: [
      "You check the back seat for clones before starting any vehicle.",
      "You wake every Monday owing money in a currency that bites.",
      "Your emergency contact now answers as your legally designated space spouse.",
      "You reach Sunday checkout several hours before Saturday check-in.",
    ],
    treatments: [
      "Return the sedan with a full tank and the original timeline.",
      "Avoid orbital casinos until Earth is removed from your credit report.",
      "Let Agent J annul the karaoke marriage before the livestock tribunal reconvenes.",
      "Block the Martian concierge until the motel's time loop reaches Monday.",
    ],
  },
  {
    id: "previous-life",
    periods: [
      "the lunar tax year before your most recent death",
      "your previous incarnation's final customs shift",
      "the century when you collected bribes in oxygen",
      "the week your former corpse lost its pension",
    ],
    locations: [
      "the contraband desk at a bankrupt Moon colony",
      "the reincarnation office beside the employee crematorium",
      "a lunar customs booth with a revolving evidence locker",
      "an oxygen depot serving smugglers and minor royalty",
    ],
    reasons: [
      "your former signature approved the asteroid that destroyed employee parking",
      "the reincarnation office sent your criminal record forward with your soul",
      "your current face still opens the lunar contraband vault",
      "three dead smugglers identified your aura from a lineup",
    ],
    evidenceItems: [
      "a lunar customs ledger containing your current fingerprints",
      "your previous employee badge still warm from the reincarnation furnace",
      "a portrait of your former body making the exact face you make near evidence",
      "the unpaid oxygen bribe that followed your soul into collections",
    ],
    residualSymptoms: [
      "You inspect every asteroid manifest for employee parking.",
      "Your soul sweats whenever somebody mentions customs enforcement.",
      "You inspect every suitcase for undeclared moon rocks.",
      "You recognize dead smugglers but keep forgetting their oxygen bribes.",
    ],
    treatments: [
      "Close the asteroid file before your former corpse loses another parking lot.",
      "Return the old badge before the reincarnation office adds another lifetime.",
      "Avoid lunar ports until your current face stops opening contraband vaults.",
      "Let Agent J settle the oxygen debt before collections seize your next body.",
    ],
  },
  {
    id: "experiment",
    periods: [
      "the afternoon the placebo requested combat pay",
      "the month your anatomy entered public beta",
      "the clinical trial that outlived its ethics committee",
      "the quarter when your organs received performance reviews",
    ],
    locations: [
      "the observation room where the control group began praying",
      "the enhancement ward beside the medical shredder",
      "a mobile clinic with a suspiciously large parts bin",
      "a Bureau laboratory built beneath a discount gym",
    ],
    reasons: [
      "the placebo developed better field instincts than you",
      "your upgraded liver started selling premium features",
      "the research team replaced its notes with individual apology letters",
      "the enhancement team calibrated your strength against snack-related rejection",
    ],
    evidenceItems: [
      "a control-group photograph in which every subject is pointing at you",
      "the prototype liver's unpaid software subscription",
      "a consent form signed with a sandwich order",
      "the laboratory invoice for alphabetizing your organs",
    ],
    residualSymptoms: [
      "Your reflexes file a support ticket before responding.",
      "Your liver displays advertisements during moments of silence.",
      "Your right arm reboots whenever danger becomes interesting.",
      "Your prototype muscles engage only when a vending machine refuses your dollar.",
    ],
    treatments: [
      "Take the placebo twice daily so it can keep supervising you.",
      "Disable automatic organ updates until the warranty dispute is settled.",
      "Return all prototype anatomy before it starts charging rent.",
      "Ask Agent J to reboot the muscles before challenging another vending machine.",
    ],
  },
  {
    id: "future",
    periods: [
      "the tomorrow you arrived early enough to ruin",
      "the final week before your preventable apocalypse",
      "the afternoon your older self blocked your number",
      "the year history added you to its emergency contacts",
    ],
    locations: [
      "a time terminal built inside a condemned shopping mall",
      "the ruined future headquarters of customer support",
      "the retirement home where your older clone filed the warning",
      "a paradox shelter overlooking your original mistake",
    ],
    reasons: [
      "your attempt to prevent the disaster caused the affordable version",
      "your older self said the mission failed the moment you volunteered to lead it",
      "the timeline could survive the truth but not another one of your victory speeches",
      "history needed everyone to forget who taught the apocalypse to improvise",
    ],
    evidenceItems: [
      "a receipt for tomorrow's autopsy bearing today's timestamp",
      "a disaster manual with your name under common causes",
      "a retirement watch engraved DO NOT LET THIS IDIOT TOUCH YESTERDAY",
      "the restraining order your older self filed across all timelines",
    ],
    residualSymptoms: [
      "You remember every apocalypse except the one you prevented correctly.",
      "Your older self leaves disappointed voicemails whenever you volunteer to lead.",
      "You flinch whenever a calendar opens to yesterday.",
      "Your shadow arrives six seconds early and starts evacuating the room.",
    ],
    treatments: [
      "Return the autopsy receipt before tomorrow notices the accounting error.",
      "Let Agent J handle the mission while you apologize to the surviving timeline.",
      "Stop giving your past self advice until the retirement watch stops vibrating.",
      "Avoid time travel while making plans, giving speeches, or operating heavy machinery.",
    ],
  },
  {
    id: "funeral",
    periods: [
      "the morning the Bureau declared you conveniently dead",
      "your first poorly attended state funeral",
      "the wake where your cover identity refused the casket",
      "the afternoon your death certificate requested corrections",
    ],
    locations: [
      "a funeral home operating under Bureau witness protection",
      "the viewing room beside a classified crematorium",
      "a cemetery reserved for identities that never existed",
      "the catering tent behind your replacement identity's grave",
    ],
    reasons: [
      "you interrupted your own eulogy to correct the least flattering lies",
      "the Bureau needed mourners to forget that the corpse had your better alibi",
      "your entrance caused the casket to demand witness protection",
      "the operation depended on everyone believing you were finally somebody else's problem",
    ],
    evidenceItems: [
      "your signed complaint about the catering at your own wake",
      "a death certificate corrected in your handwriting",
      "a burial permit naming your cover identity as both corpse and witness",
      "a condolence card addressed to your replacement identity",
    ],
    residualSymptoms: [
      "You check every obituary for unauthorized sequels.",
      "Your pulse stops briefly when somebody compliments the eulogy.",
      "You become defensive whenever a cemetery recognizes your cover identity.",
      "Your replacement identity keeps sending you funeral expenses.",
    ],
    treatments: [
      "Let Agent J deliver the next eulogy while you remain offstage.",
      "Avoid open caskets and conversations about your punctuality.",
      "Stay dead on paper until the cover operation clears the cemetery.",
      "Return the condolence money before your replacement files charges.",
    ],
  },
  {
    id: "cult",
    periods: [
      "the fiscal quarter your prophecy missed its deadline",
      "the solstice when the free buffet became a sacrament",
      "the week your followers summoned a compliance auditor",
      "the evening your apocalypse was postponed for weather",
    ],
    locations: [
      "a desert altar with municipal event permits",
      "a rented compound behind an all-night buffet",
      "the ceremonial basement of a failing office park",
      "the fellowship hall beneath an active saucer beacon",
    ],
    reasons: [
      "your sacred chant accidentally ordered a federal inspection",
      "the promised deity reviewed your doctrine and requested another cult",
      "the sacrificial fax machine was working undercover",
      "the forecast gave your apocalypse a rain date",
    ],
    evidenceItems: [
      "the prophecy revised in red ink by a health inspector",
      "a buffet coupon bearing the deity's formal rejection",
      "the undercover fax machine's final expense report",
      "a ceremonial robe itemized as a failed weatherproofing expense",
    ],
    residualSymptoms: [
      "You mistake health inspectors for minor deities.",
      "You tithe whenever a buffet opens under suspicious lighting.",
      "Your chanting voice automatically requests a permit number.",
      "Your followers still send calendar invites for the postponed apocalypse.",
    ],
    treatments: [
      "Pay the cult's cancellation fee before the inspector closes the prophecy.",
      "Dissolve the cult before the buffet renews its catering contract.",
      "Stop accepting prophecy edits from office equipment.",
      "Ask Agent J to cancel the apocalypse without extending your lease.",
    ],
  },
  {
    id: "classified-employment",
    periods: [
      "the final shift before Human Resources erased the building",
      "your brief career in restricted evidence logistics",
      "the quarter when payroll classified you as office furniture",
      "the night your exit interview removed eleven years",
    ],
    locations: [
      "a black-site mailroom with armed return labels",
      "the confiscated-property cage beneath Bureau headquarters",
      "the employee break room reserved for deniable personnel",
      "the evidence warehouse between Sublevels Six and Eight",
    ],
    reasons: [
      "you shipped a live artifact to the office holiday raffle",
      "the alien ambassador found its missing anatomy in your lunch bag",
      "your inventory report listed three corpses as remote employees",
      "human resources discovered that your security clearance came from a cereal box",
    ],
    evidenceItems: [
      "your employee badge stamped return to sender",
      "the lunch bag containing one ambassadorial organ and your initials",
      "an inventory sheet signed by three deceased remote employees",
      "a termination notice addressed to the office chair you replaced",
    ],
    residualSymptoms: [
      "You sort household objects by threat level before breakfast.",
      "Your lunch bag growls whenever an ambassador enters the building.",
      "You clock in automatically when somebody opens an evidence locker.",
      "Your pension statement lists one haunted pager and no dignity.",
    ],
    treatments: [
      "Keep all raffle prizes sealed until Agent J checks for a pulse.",
      "Return the ambassador's property before lunch becomes a diplomatic incident.",
      "Stop answering payroll emails addressed to office furniture.",
      "Report to Human Resources only after confirming that the building exists.",
    ],
  },
];

export const MEMORY_SCENARIOS = deepFreeze(scenarios);

const dossierIds = deepFreeze({
  abduction: [
    "abduction-orbital-copay",
    "abduction-probe-claim",
    "abduction-examination-scar",
    "abduction-quarantine",
  ],
  childhood: [
    "childhood-field-trip",
    "childhood-science-fair",
    "childhood-class-pet",
    "childhood-imaginary-diplomat",
  ],
  "missing-weekend": [
    "missing-weekend-sedan-clone",
    "missing-weekend-orbital-casino",
    "missing-weekend-karaoke-wedding",
    "missing-weekend-martian-motel-time-loop",
  ],
  "previous-life": [
    "previous-life-asteroid",
    "previous-life-criminal-record",
    "previous-life-contraband-vault",
    "previous-life-dead-smugglers",
  ],
  experiment: [
    "experiment-placebo",
    "experiment-ad-supported-liver",
    "experiment-apology-trial",
    "experiment-vending-machine-muscles",
  ],
  future: [
    "future-autopsy-receipt",
    "future-failed-leadership",
    "future-retirement-warning",
    "future-evacuating-shadow",
  ],
  funeral: [
    "funeral-eulogy-interruption",
    "funeral-better-alibi",
    "funeral-cover-identity",
    "funeral-replacement-identity",
  ],
  cult: [
    "cult-inspection",
    "cult-buffet-deity",
    "cult-undercover-fax",
    "cult-weather-delay",
  ],
  "classified-employment": [
    "classified-employment-raffle",
    "classified-employment-ambassador-lunch",
    "classified-employment-remote-corpses",
    "classified-employment-cereal-clearance",
  ],
});

export const MEMORY_DOSSIERS = deepFreeze(
  MEMORY_SCENARIOS.flatMap((scenario) =>
    dossierIds[scenario.id].map((id, index) => ({
      id,
      familyId: scenario.id,
      period: scenario.periods[index],
      location: scenario.locations[index],
      reason: scenario.reasons[index],
      evidenceItem: scenario.evidenceItems[index],
      residualSymptom: scenario.residualSymptoms[index],
      treatment: scenario.treatments[index],
    })),
  ),
);
