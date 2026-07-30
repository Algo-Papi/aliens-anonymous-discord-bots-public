function deepFreeze(value) {
  if (Array.isArray(value)) {
    for (const item of value) {
      deepFreeze(item);
    }
  } else if (value && typeof value === "object") {
    for (const item of Object.values(value)) {
      deepFreeze(item);
    }
  }
  return Object.freeze(value);
}

export const SIMPLE_POOL_EXPANSIONS = deepFreeze({
  species: [
    "Municipal Grey assembled from expired parking citations",
    "Reptilian middle manager wearing a human suit from the outlet rack",
    "Interdimensional possum with diplomatic immunity and untreated ambition",
    "Vat-grown Bureau subcontractor whose warranty was voided at birth",
    "Sentient weather balloon operating under three shell corporations",
  ],
  origin: [
    "the condemned food court beneath Zeta Reticuli",
    "a moon where every organism is legally classified as a workplace incident",
    "the trunk of an unmarked sedan parked outside causality",
    "a failed timeline currently being used for federal storage",
    "the employee restroom at a black site that officially has no plumbing",
  ],
  anomaly: [
    "a second jaw that only opens for classified gossip",
    "kneecaps registered as short-range surveillance equipment",
    "one removable spine containing somebody else's browser history",
    "a navel that broadcasts numbers stations during emotional distress",
    "three kidneys arranged in the shape of a federal warning symbol",
  ],
  "scan-threat": [
    "Moderate threat; becomes strategic when exposed to an open bar",
    "Severe threat to upholstery, morale, and unsecured congressional interns",
    "Low combat risk but catastrophic near photocopiers and livestock",
    "Containment priority rises sharply whenever the subject says watch this",
    "Planetary nuisance with regional access to improvised explosives",
  ],
  "scan-weakness": [
    "direct sunlight and questions requiring a second source",
    "the sound of a belt being removed by a disappointed federal supervisor",
    "unseasoned chicken and any room with accountable leadership",
    "mirrors positioned low enough to reveal the maintenance zipper",
    "a properly completed expense form placed inside a salt circle",
  ],
  disposition: [
    "Release under surveillance disguised as an embarrassingly attentive Uber driver",
    "Quarantine beside the evidence refrigerator until both stop moving",
    "Return to manufacturer with a note reading personality arrived damaged",
    "Assign to congressional outreach where no measurable harm is possible",
    "Neuralyze, re-tag, and reintroduce several counties away from livestock",
  ],
  "scan-confidence": [
    "97% — the scanner tried to resign after the second pass",
    "83% — confirmed by a dermatologist with Majestic clearance",
    "64% — the remaining uncertainty is legally considered body odor",
    "41% — subject may be two raccoons sharing an alibi",
    "12% — equipment was calibrated using gas-station sushi",
  ],
  "memory-period": [
    "the fiscal quarter your childhood was outsourced",
    "eleven minutes before your first documented reincarnation",
    "the winter the government repossessed one of your birthdays",
    "a long weekend erased from every calendar except the Moon's",
    "the Tuesday your future self filed for a restraining order",
  ],
  "memory-location": [
    "an abandoned laser-tag arena beneath a functioning black site",
    "the honeymoon suite of a motel that accepts moon currency",
    "a livestock tribunal convened inside a decommissioned Arby's",
    "the emergency stairwell between two incompatible timelines",
    "a government warehouse labeled seasonal decorations and organs",
  ],
  "memory-reason": [
    "the subject learned which senator hatches during committee recess",
    "the incident proved the Moon has a customer-service department",
    "three agencies accidentally admitted the same lie in writing",
    "the recovered device kept calling the President collect",
    "the witness correctly identified Agent K's least flattering decade",
  ],
  "memory-evidence": [
    "a motel key stamped ROOM ∞ and still warm",
    "one molted human identity folded inside a sandwich bag",
    "a neuralyzer receipt signed by your future emergency contact",
    "three teeth belonging to a species that only eats radio signals",
    "a federal ankle monitor with mileage from outside the solar system",
  ],
  "memory-residual": [
    "uncontrollable saluting whenever a microwave reaches zero",
    "recurring dreams narrated by a disappointed customs officer",
    "a phantom fourth arm that keeps filing expense reports",
    "temporary fluency in a language spoken only by deceased vending machines",
    "violent distrust of ceiling tiles arranged in congressional districts",
  ],
  "memory-treatment": [
    "Avoid mirrors, crop circles, and anyone introducing themselves as your original",
    "Take two antacids and one supervised memory wipe after every podcast",
    "Sleep beneath a Faraday blanket until the implants lose interest",
    "Report weekly for posture correction and unauthorized-soul inventory",
    "Replace all family photos showing more relatives than attended",
  ],
  "memory-confidence": [
    "98% — your previous corpse confirmed the appointment",
    "86% — recovered footage passed smell-based authentication",
    "72% — supported by two agents and one emotionally credible goat",
    "44% — timeline contamination or ordinary Florida remains possible",
    "6% — Agent J still trusts it more than your conscious account",
  ],
  "sensor-confidence": [
    "99% — all instruments agree and one has begun praying",
    "88% — corroborated by radar, thermal imaging, and a frightened Roomba",
    "67% — clean reading except for one sensor currently testifying",
    "39% — equipment may have confused hostility with unpaid child support",
    "11% — analyst was neuralyzed halfway through calibration",
  ],
});

export const OBSERVATION_EXPANSIONS = deepFreeze({
  witness: {
    reactions: [
      "requested asylum inside the nearest vending machine",
      "began speaking exclusively through a court-appointed medium",
      "removed both shoes in preparation for an undocumented rapture",
      "filed a complaint against gravity and the subject's mother",
      "started live-streaming under the title final human mistake",
    ],
    actions: [
      "used a tractor beam to steal catalytic converters",
      "attempted first contact through an airport bathroom hand dryer",
      "sold fake neuralyzer insurance to a bus full of retirees",
      "released a juvenile black hole into the condiment aisle",
      "challenged a Grey to identify which organ was legally theirs",
    ],
    outcomes: [
      "a federal quarantine around one extremely embarrassed Waffle House",
      "the creation of a witness-protection program for household appliances",
      "seven livestock resigning from agriculture without notice",
      "a county ordinance banning unexplained moisture after sunset",
      "the Moon filing a noise complaint through diplomatic channels",
    ],
  },
  surveillance: {
    reactions: [
      "deleted their browser history using a fire extinguisher",
      "assumed the fetal position inside an evidence bag",
      "called Homeland Security and asked to be put on hold permanently",
      "began narrating the footage in a voice reserved for nature documentaries",
      "confessed to three unrelated crimes to speed up containment",
    ],
    actions: [
      "installed alien spyware on a smart refrigerator at headquarters",
      "used crop-circle geometry to bypass a drive-through",
      "parked a cloned sedan inside the original sedan",
      "attempted to bribe a satellite with premium pornography",
      "broadcast classified coordinates through a children's karaoke machine",
    ],
    outcomes: [
      "forced the surveillance team to neuralyze its own equipment",
      "caused two satellites to request different legal guardians",
      "left the Bureau monitoring itself in an infinite administrative loop",
      "triggered an evacuation of every van with tinted windows",
      "made the footage apply for sealed-record status",
    ],
  },
  medical: {
    reactions: [
      "a contagious belief that every doorway was personally judging them",
      "sudden migration of the patient's legal name into the lower intestine",
      "acute federal embarrassment with secondary organ involvement",
      "a memory rash spelling out coordinates to a condemned mall",
      "temporary pregnancy with an unpaid parking citation",
    ],
    actions: [
      "used a neuralyzer as an unlicensed fertility treatment",
      "replaced their kneecap with a tracking device from a rental saucer",
      "attempted to vaccinate a Reptilian using cocktail sauce",
      "performed an alien autopsy while the alien handled billing",
      "stored a live implant beside the staff-room yogurt",
    ],
    outcomes: [
      "an emergency room becoming legally non-Euclidean",
      "four nurses developing the same classified childhood",
      "a malpractice settlement payable entirely in moon rocks",
      "the patient's organs organizing a hostile takeover",
      "one surgeon being reassigned to veterinary counterintelligence",
    ],
  },
  criminal: {
    reactions: [
      "requested extradition to a planet without discovery rules",
      "identified the getaway craft by its emotional unavailability",
      "asked for protective custody inside a larger suspect",
      "submitted a sketch artist's drawing of an impossible angle",
      "pled guilty to being on the same continent",
    ],
    actions: [
      "sold cloned federal agents from a pop-up kiosk",
      "operated an unlicensed portal behind a payday lender",
      "counterfeited moon rocks using actual moon rocks",
      "stole an alien identity and ruined its credit within hours",
      "laundered antimatter through a church raffle",
    ],
    outcomes: [
      "a grand jury composed entirely of nervous cattle",
      "the evidence locker being charged as an accomplice",
      "three planets filing competing extradition requests",
      "a getaway vehicle testifying under an assumed license plate",
      "the suspect's fingerprints appearing on next Thursday",
    ],
  },
  insurance: {
    reactions: [
      "interdimensional water damage with no covered dimension",
      "loss of consortium with a spouse not born until 2041",
      "aggravated depreciation of one government-issued soul",
      "hail damage caused by frozen alien reproductive material",
      "unauthorized reality expansion beneath the insured premises",
    ],
    actions: [
      "filed a collision claim against an invisible mothership",
      "insured a stolen saucer as a recreational gazebo",
      "used a clone to submit the same bodily-injury claim twice",
      "parked a portal across three handicapped spaces",
      "declared missing time as a tax-deductible vacation rental",
    ],
    outcomes: [
      "the underwriter entering a monastery outside spacetime",
      "a deductible that achieved independent consciousness",
      "the policy exclusions gaining orbital strike capability",
      "an actuarial table being sealed as a crime scene",
      "the entire claims department reincarnating as simpler organisms",
    ],
  },
  coroner: {
    reactions: [
      "classified the remains as recently inconvenienced",
      "requested dental records from the subject's next body",
      "determined the corpse had died of excessive government interest",
      "found the deceased legally alive in two hostile jurisdictions",
      "refused to continue until the cadaver stopped taking notes",
    ],
    actions: [
      "performed an autopsy on a body still attending the meeting",
      "used alien embalming fluid to restart a vending machine",
      "hid a classified organ inside an unclassified coroner",
      "mistook a clone warranty card for a death certificate",
      "attempted cremation with a recovered propulsion core",
    ],
    outcomes: [
      "the corpse receiving a promotion over the attending physician",
      "three causes of death and one cause of continued employment",
      "an autopsy report written entirely from the victim's perspective",
      "the morgue losing its license to operate in linear time",
      "a toe being appointed interim medical examiner",
    ],
  },
});

export const MEMORY_FAMILY_EXPANSIONS = deepFreeze({
  abduction: {
    incidents: [
      "were returned by abductors with a handwritten apology and one fewer original organ",
      "woke inside a saucer gift shop wearing a medical gown priced for tourists",
      "were selected for hybridization until the hybrids reviewed your credit score",
      "escaped an examination table by claiming the probe had an active product recall",
      "mistook a cattle-mutilation beam for complimentary spa lighting",
    ],
    escalations: [
      "The ship later blocked your planet and changed its emergency frequency.",
      "A Grey submitted the procedure footage as evidence in its own malpractice hearing.",
      "Your replacement organ continues to receive promotional messages from the mothership.",
      "The crew returned your dignity by mail, postage due.",
      "Earth was added to the vessel's do-not-resuscitate list.",
    ],
  },
  childhood: {
    incidents: [
      "used a school telescope to establish diplomatic contact with something beneath the playground",
      "hatched the class pet during a standardized test",
      "brought a neuralyzer to picture day and erased the wrong decade",
      "sold moon rocks door to door before learning they were still occupied",
      "won show-and-tell with a federal organ your parents deny purchasing",
    ],
    escalations: [
      "The PTA meeting was sealed for seventy-five years.",
      "Your yearbook lists species instead of senior superlatives.",
      "The substitute teacher was recalled to its manufacturer before lunch.",
      "Every child received therapy except the one who arrived in the egg.",
      "The playground remains a restricted landing zone during recess.",
    ],
  },
  "missing-weekend": {
    incidents: [
      "rented a motel room with three clones and checked out as the security deposit",
      "spent Saturday officiating a Reptilian divorce aboard a stolen weather balloon",
      "won a moon casino using organs that had not been invented yet",
      "joined a Bureau bachelor party and woke legally married to a surveillance van",
      "drove to Nevada and returned from a county that does not border time",
    ],
    escalations: [
      "Your phone recorded eleven hours of breathing from inside the glove box.",
      "The motel charged an interdimensional cleaning fee and one exorcism.",
      "Sunday filed a restraining order against the entire group.",
      "The clone kept the rental car and your preferred childhood.",
      "Monday arrived carrying police evidence from the following Thursday.",
    ],
  },
  "previous-life": {
    incidents: [
      "served as a court astrologer until the stars filed a hostile-workplace complaint",
      "were a respected Grey surgeon before losing a patient inside another patient",
      "ruled a lunar kingdom that overthrew you during a long bathroom break",
      "worked as a plague doctor whose mask contained the actual doctor",
      "commanded a reptilian monastery dedicated to tax evasion and tasteful robes",
    ],
    escalations: [
      "Your former subjects still forward the property-tax notices.",
      "The old body has challenged the current one to binding arbitration.",
      "A museum portrait recognizes you and refuses to explain why.",
      "The reincarnation office has suspended your loyalty benefits.",
      "Your karmic file now requires a pallet jack.",
    ],
  },
  experiment: {
    incidents: [
      "tested a teleportation belt that moved only the parts covered by insurance",
      "accepted a prototype personality downloaded from a divorced game-show host",
      "joined a sleep study and woke as the control group's legal guardian",
      "received experimental gills designed exclusively for breathing courtroom air",
      "let the Bureau replace your fear response with sponsored content",
    ],
    escalations: [
      "The research team deleted the hypothesis and kept the restraining order.",
      "Your placebo became sentient and asked to leave the trial.",
      "The grant was renewed under the category preventable miracles.",
      "Every side effect now has its own side effect.",
      "The ethics board relocated without providing a forwarding dimension.",
    ],
  },
  future: {
    incidents: [
      "returned from 2088 to stop a war and accidentally licensed the soundtrack",
      "met your future body after it had been repossessed by a medical lender",
      "stole tomorrow's newspaper and found your alibi in the obituary section",
      "attended Earth's evacuation and missed boarding while arguing about parking validation",
      "received a call from your final clone asking you to stop creating intermediate versions",
    ],
    escalations: [
      "The timeline placed your username on parental controls.",
      "Tomorrow now arrives five minutes late to avoid you.",
      "Your future descendants have collectively changed their surname.",
      "History survived but no longer makes eye contact.",
      "The paradox lists you as both cause and pre-existing condition.",
    ],
  },
  funeral: {
    incidents: [
      "sold counterfeit resurrection vouchers beside an open casket",
      "attended your own funeral and disputed the catering invoice",
      "neuralyzed the mourners before discovering the deceased was only sleeping",
      "served as pallbearer for a coffin containing your future landlord",
      "released a cloned widow into the wrong memorial service",
    ],
    escalations: [
      "The deceased requested a quieter family during closing remarks.",
      "The cemetery installed a species-checking turnstile the following morning.",
      "Your eulogy was entered as contributing cause of death.",
      "The coffin left early and has not returned calls.",
      "Afterlife security footage shows you being denied reentry.",
    ],
  },
  cult: {
    incidents: [
      "founded a saucer cult whose sacred text was an expired appliance warranty",
      "performed a fertility rite that summoned a federal tax auditor",
      "became high priest after correctly guessing the deity's Wi-Fi password",
      "sacrificed a weather balloon and angered the actual weather",
      "sold ascension packages from a kiosk beside the compound bathroom",
    ],
    escalations: [
      "The deity arrived, reviewed the ceremony, and requested a different cult.",
      "Your prophecy was fulfilled by a regional plumbing failure.",
      "The followers ascended legally by taking the service elevator.",
      "The compound was condemned by both the county and the cosmos.",
      "The sacred robes remain evidence in a class-action divorce.",
    ],
  },
  "classified-employment": {
    incidents: [
      "managed payroll for clones who shared one Social Security number and several organs",
      "worked the overnight shift inside a hangar that appeared only during budget hearings",
      "served lunch to alien ambassadors using utensils recovered from their enemies",
      "ran quality control for neuralyzers despite remembering none of the training",
      "processed returns at a Bureau organ depot with a strict no-receipt policy",
    ],
    escalations: [
      "Human Resources erased the complaint and accidentally promoted it.",
      "Your employee badge still opens a restroom beneath Greenland.",
      "Payroll continues depositing one cent every time a satellite dies.",
      "The exit interview removed your employment and most of high school.",
      "Your former supervisor denies existing but still schedules quarterly reviews.",
    ],
  },
});

function buildTierExpansions(tiers, renderers) {
  return tiers.map((tier) => renderers.map((render) => render(tier)));
}

const TIER_CONTEXTS = deepFreeze([
  {
    name: "administrative nuisance",
    reach: "one poorly supervised office",
    target: "an unattended sandwich",
    response: "a sternly worded sticky note",
    aftermath: "minor paperwork and one offended fern",
  },
  {
    name: "localized biological embarrassment",
    reach: "a bowling alley and adjacent parking lot",
    target: "civilian ankles and rental upholstery",
    response: "two agents carrying a fitted sheet",
    aftermath: "regional shame with limited property damage",
  },
  {
    name: "municipal containment problem",
    reach: "several zip codes and one unlicensed portal",
    target: "electrical infrastructure and elected confidence",
    response: "an armed response team with veterinary support",
    aftermath: "a countywide curfew and expensive smells",
  },
  {
    name: "nationally significant hostile organism",
    reach: "the eastern seaboard before lunch",
    target: "air-defense networks and load-bearing senators",
    response: "full Bureau mobilization with orbital backup",
    aftermath: "cabinet-level panic and aggressive reconstruction",
  },
  {
    name: "planetary extinction-adjacent asset",
    reach: "every continent plus the parts governments rent",
    target: "human civilization and its least useful monuments",
    response: "global containment followed by selective prayer",
    aftermath: "species-wide trauma and a thriving documentary market",
  },
  {
    name: "reality-ending executive threat",
    reach: "all inhabited timelines simultaneously",
    target: "causality, mortality, and the concept of indoors",
    response: "evacuation beyond mathematics",
    aftermath: "the universe reopening under new management",
  },
]);

export const THREAT_TIER_EXPANSIONS = deepFreeze({
  classification: buildTierExpansions(TIER_CONTEXTS, [
    (tier) => `Provisional ${tier.name} with an inflated self-assessment`,
    (tier) => `Bureau-rated ${tier.name} operating without adult supervision`,
    (tier) => `Weaponized ${tier.name} disguised as a routine inconvenience`,
    (tier) => `Containment-class ${tier.name} with prior warranty violations`,
    (tier) => `Unlicensed ${tier.name} currently lying about its dimensions`,
  ]),
  capability: buildTierExpansions(TIER_CONTEXTS, [
    (tier) => `Can compromise ${tier.reach} using only eye contact and stolen office supplies`,
    (tier) => `Demonstrated operational reach across ${tier.reach}`,
    (tier) => `Capable of converting ${tier.target} into a tactical liability`,
    (tier) => `Sustains combat operations long enough to produce ${tier.aftermath}`,
    (tier) => `Projects force until opposition requires ${tier.response}`,
  ]),
  attack: buildTierExpansions(TIER_CONTEXTS, [
    (tier) => `Launches a directed insult that physically destabilizes ${tier.target}`,
    (tier) => `Deploys stolen Bureau technology against ${tier.reach}`,
    (tier) => `Weaponizes body odor until containment requires ${tier.response}`,
    (tier) => `Opens an unauthorized portal beneath ${tier.target}`,
    (tier) => `Emits a psychic invoice capable of causing ${tier.aftermath}`,
  ]),
  defense: buildTierExpansions(TIER_CONTEXTS, [
    (tier) => `Redirects incoming fire toward ${tier.target} and denies involvement`,
    (tier) => `Surrounds itself with a field rated against ${tier.response}`,
    (tier) => `Regenerates damage by consuming the nearest piece of ${tier.reach}`,
    (tier) => `Becomes legally intangible whenever threatened with ${tier.aftermath}`,
    (tier) => `Uses a cloned alibi to survive attacks intended for ${tier.name}`,
  ]),
  weakness: buildTierExpansions(TIER_CONTEXTS, [
    (tier) => `Collapses when confronted by ${tier.response} and a valid receipt`,
    (tier) => `Loses combat effectiveness after exposure to ${tier.aftermath}`,
    (tier) => `Cannot cross a salt circle drawn around ${tier.target}`,
    (tier) => `Becomes docile when promised jurisdiction over ${tier.reach}`,
    (tier) => `Vulnerable to mirrors showing the true face of ${tier.name}`,
  ]),
  casualty: buildTierExpansions(TIER_CONTEXTS, [
    (tier) => `${tier.target} will be declared missing and later found in management`,
    (tier) => `${tier.response} is expected to sustain career-ending embarrassment`,
    (tier) => `${tier.reach} may become permanently allergic to government explanations`,
    (tier) => `Projected losses include ${tier.aftermath}`,
    (tier) => `The first casualty will be whoever described this as ${tier.name}`,
  ]),
  containment: buildTierExpansions(TIER_CONTEXTS, [
    (tier) => `Establish ${tier.response}, then evacuate ${tier.reach}`,
    (tier) => `Bait the subject with ${tier.target} and seal the perimeter using tax law`,
    (tier) => `Induce hibernation by repeatedly describing ${tier.aftermath}`,
    (tier) => `Transfer custody to ${tier.response} before the paperwork becomes sentient`,
    (tier) => `If containment fails, reclassify ${tier.name} as weather and leave orbit`,
  ]),
});
