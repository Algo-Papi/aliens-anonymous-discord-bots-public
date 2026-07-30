import "dotenv/config";

import { randomInt } from "node:crypto";

export const ORB_REFERENCE_URL =
  process.env.ORB_REFERENCE_URL?.trim() ||
  "https://example.com/orb-archive";

export const DIRECT_RESPONSES = Object.freeze([
  "Agent K reporting. Your ping has been logged, classified, and judged suspicious.",
  "You rang? Please remain still while I decide whether this requires paperwork or a neuralyzer.",
  "Bureau finding: one person can reason; a crowd can turn a weather balloon into a constitutional crisis.",
  "This is Aliens Anonymous enforcement. State your business, your clearance level, and your preferred cover story.",
  "I was not summoned. You merely activated a pre-existing surveillance protocol.",
  "Agent K online. Keep your hands visible and your conspiracy tabs open.",
  "Agent K here. State your species, clearance level, and why this could not have been an email.",
  "Bureau policy: start nonsense, receive paperwork. This is the complimentary warning.",
  "Your ping has reached the correct department. Unfortunately for you, the correct department is me.",
  "Agent K responding. I left a perfectly good cover-up for this, so whatever comes next had better contain evidence or snacks.",
  "You summoned a federal agent through Discord. That decision now has its own sealed psychiatric appendix.",
  "Your message was routed through six black sites and one deeply judgmental pug. Agent K has the file.",
]);

export const TOPIC_RESPONSES = Object.freeze({
  classified: Object.freeze([
    "You said “classified.” Please look directly at the red light and forget you ever learned how quotation marks work.",
    "CLASSIFIED is not a topic; it is the Bureau's favorite way of saying “nice try.”",
    "That file is classified. So is the reason your clearance request was denied.",
    "Classified detected. Your clearance level is somewhere between civilian and unattended luggage; even the redactions are above your pay grade.",
    "The Bureau acknowledges your use of “classified” and denies the existence of this acknowledgement.",
    "You do not have clearance for that file. Frankly, the file does not have clearance for you.",
    "Classified material detected. Your personnel badge just turned itself around to avoid being associated with you.",
    "The redactions are not hiding secrets from the public. They are hiding the public from your reading comprehension.",
    "Access denied. The vending machine at headquarters outranks you and has completed more successful missions.",
  ]),
  uap: Object.freeze([
    "UAP detected. Official assessment: weather balloon. Unofficial assessment: stop asking questions above your clearance.",
    "That UAP has been identified as swamp gas reflecting off a highly classified group chat.",
    "UAP report received. If it's clear, it's a balloon; if it's blurry, apparently it gets a congressional hearing.",
    "Unidentified, anomalous, and already being explained by a man with a laser pointer and no clearance.",
    "The object demonstrated impossible acceleration, no visible propulsion, and excellent timing for someone's podcast.",
    "UAP logged. The sensors agree something happened; the agencies agree not to agree on what.",
    "UAP report accepted. Radar saw it, pilots chased it, and Public Affairs has already blamed a reflective seagull.",
    "The object crossed restricted airspace at impossible speed, then slowed down long enough to ruin four careers.",
    "Anomalous signature confirmed. The Bureau recommends controlled panic followed by uncontrolled paperwork.",
  ]),
  uapgerb: Object.freeze([
    "UAPGerb detected. The Bureau has classified the gerbil wheel as a rotating sensor platform.",
    "Gerb uploaded again. Somewhere, a grainy object is being stabilized until it develops a tax history.",
    "UAPGerb reference logged. The Bureau appreciates any investigator willing to enter the YouTube comments without protective equipment.",
    "Gerb reviewed the footage. Preliminary finding: the pixels know what they saw and have retained counsel.",
    "UAPGerb is on the case. Agent K requisitioned one corkboard, twelve red strings, and a wheel rated for transmedium travel.",
    "Gerb report received. The anomaly was enhanced, enlarged, and politely asked to stop being a balloon.",
    "UAPGerb briefing scheduled. Refreshments include sunflower seeds and evidence that refuses to remain in focus.",
    "The Bureau denies employing UAPGerb. We merely leave case files beside the exercise wheel and they return annotated.",
    "Gerb stabilized the footage until the object developed edges, motives, and a surprisingly hostile LinkedIn profile.",
    "UAPGerb has entered the evidence burrow. Expect three enhancements, one excellent diagram, and no respect for balloons.",
    "The Bureau gave Gerb twelve blurry pixels. He returned a flight path, a suspect list, and demands for a larger exercise wheel.",
  ]),
  elizondo: Object.freeze([
    "Elizondo reference logged. The soul patch knows more than it is authorized to disclose.",
    "Lue has entered the conversation. Somewhere, an NDA just tightened itself.",
    "Lue Elizondo mentioned. The Bureau opened a file, announced the file, then scheduled a podcast explaining why it cannot discuss the file.",
    "Lue says disclosure is right around the corner. Bureau satellites confirm the corner is moving at exactly Lue's speed.",
    "“Imagine what you'll know tomorrow.” — K. Lue has successfully extended “tomorrow” for another fiscal quarter.",
    "Elizondo update: something enormous is coming soon, but apparently “soon” has its own security clearance.",
    "Lue has promised the next revelation will change everything. The last seventeen revelations have formed a support group.",
    "Elizondo says he knows more than he can say, which remains an extraordinary business model for saying things professionally.",
    "The Bureau located disclosure right behind Lue's next interview, where it has apparently lived rent-free for years.",
  ]),
  ufo: Object.freeze([
    "UFO detected. Please select the official explanation: Venus, hobby drone, or collective failure to focus.",
    "The Bureau retired the term UFO, but the object declined to complete the rebranding paperwork.",
    "UFO report logged. The photograph contains twelve pixels and somehow seventeen conclusions.",
    "Unidentified flying object? Around here we call that an unfunded paperwork opportunity.",
    "The object remains unidentified because everyone with identification authority is currently appearing on a podcast.",
    "UFO confirmed. It flew, it was an object, and that is as far as your clearance carries you.",
    "UFO logged. The craft violated physics, airspace, and the unwritten rule against making generals look confused.",
    "The saucer requested identification from us first. The Bureau has postponed the encounter pending embarrassment review.",
    "Flying object remains unidentified, although the thumbnail has already identified it as civilization-ending.",
  ]),
  disclosure: Object.freeze([
    "Disclosure is scheduled for immediately after the next book tour, documentary, hearing, and preventable delay.",
    "Catastrophic disclosure is ordinary disclosure with sirens, lawyers, and a less cooperative release calendar.",
    "Every time someone says “disclosure,” the Bureau moves it back one fiscal quarter.",
    "Disclosure clock reset. Someone promised the truth was only two weeks away again.",
    "Full disclosure: the people holding microphones still have not brought the documents.",
    "The Bureau reviewed the disclosure plan and replaced every useful noun with a black rectangle.",
    "Disclosure has been rescheduled for the first business day after hell completes its environmental-impact study.",
    "The truth is coming out slowly because every agency insists on carrying it through a different locked basement.",
    "Disclosure achieved: the government has formally admitted that it continues to admit absolutely nothing useful.",
  ]),
  nhi: Object.freeze([
    "Non-human intelligence detected. Human intelligence remains unconfirmed at this location.",
    "NHI is the Bureau's efficient way of saying “not us” without committing to who it is.",
    "If it is intelligent enough to cross dimensions and avoid this group chat, the classification seems earned.",
    "The NHI has filed a formal complaint about being dragged into another podcast thumbnail.",
    "The acronym saves time, which investigators immediately reinvested in arguing about the acronym.",
    "Bureau assessment: intelligence appears non-human; the comment section appears neither.",
    "NHI confirmed. It crossed interstellar space, reviewed this channel, and requested immediate reassignment.",
    "Non-human intelligence is present. Human intelligence remains delayed in transit with no tracking number.",
    "The entity demonstrated advanced cognition by refusing every invitation to join the discourse.",
  ]),
  whistleblower: Object.freeze([
    "Whistleblower detected. Please verify that the whistle contains documents and not another trailer for an interview.",
    "The Bureau supports whistleblowers; it is the blowing smoke without receipts that creates paperwork.",
    "Credentialed, decorated, and somehow still one attachment short of the evidence folder.",
    "A source familiar with the matter is not the same thing as the matter becoming familiar with us.",
    "The SCIF is where public evidence goes to become classified vibes with excellent posture.",
    "Whistleblower report logged. Retaliation is forbidden, skepticism is permitted, and chain of custody is not optional.",
    "Whistleblower detected. The résumé is impressive; the evidence is apparently arriving by separate emotional shipment.",
    "The source has credentials, testimony, and seventeen reasons the documents cannot be shown before the documentary premieres.",
    "Bureau reminder: blowing the whistle is brave. Selling tickets to hear what the whistle might someday reveal is marketing.",
  ]),
  crash_retrieval: Object.freeze([
    "Crash-retrieval team dispatched. The tow truck has Majestic clearance and absolutely no insurance.",
    "We retrieve craft, debris, and occasionally a witness's dignity.",
    "Nothing crashed. The government simply purchased forty acres at 3 a.m. and threatened the weather.",
    "Vehicle recovered. Manufacturer warranty voided by unauthorized transmedium operation.",
    "The Bureau prefers “unscheduled landing with aggressive disassembly.”",
    "Occupants declined roadside assistance and requested a species with better customer service.",
    "Crash-retrieval unit arrived before the smoke cleared and somehow billed the weather for trespassing.",
    "Recovered vehicle has no rivets, no engine, and one cup holder specifically designed to insult human anatomy.",
    "The craft was retrieved intact except for the parts distributed across three counties and one senator's garage.",
  ]),
  reverse_engineering: Object.freeze([
    "Reverse-engineering update: the engineers found the front but still cannot locate the manual.",
    "We spent eighty years turning impossible propulsion into a slightly warmer conference room.",
    "The technology is centuries ahead; procurement remains two fiscal years behind.",
    "The Bureau copied the propulsion system and successfully reproduced the warning light.",
    "Scientists asked the craft how it worked. The craft returned “skill issue.”",
    "The recovered alloy survived reentry; the reverse-engineering PowerPoint did not survive peer review.",
    "Reverse-engineering milestone reached: the team reproduced the humming noise and none of the useful properties.",
    "Engineers opened the craft, found no wires, and promoted the intern who suggested closing it again.",
    "The propulsion system bends spacetime. Procurement is still waiting on a compatible extension cord.",
  ]),
  ontological_shock: Object.freeze([
    "Ontological shock is what happens when a worldview meets a classified memo at highway speed.",
    "Please remain calm. Reality was patched overnight and the release notes are above your clearance.",
    "Known side effects include staring at the sky and using the word “paradigm” in ordinary conversation.",
    "The Bureau offers no refunds when the universe turns out to have additional terms and conditions.",
    "Your ontology has been recalled. A replacement belief system will arrive in six to eight business decades.",
    "If disclosure causes ontological shock, do not operate a podcast until the room stops spinning.",
    "Ontological shock confirmed. Your worldview has left the building wearing somebody else's shoes.",
    "Reality expanded without warning and your belief system is now blocking the emergency exit.",
    "The Bureau recommends hydration, deep breathing, and not learning what the mantids think happens after death.",
  ]),
  interdimensional: Object.freeze([
    "Interdimensional visitor detected. It entered without declaring three extra dimensions at customs.",
    "The passport was stamped in three dimensions; the traveler insists there were eleven.",
    "The Bureau traced the signal to a dimension where this argument was intelligent.",
    "They are not from outer space. They took the wrong exit off spacetime and refuse to ask directions.",
    "Portal closed for zoning violations and unauthorized tentacle parking.",
    "Interdimensional theory: for when extraterrestrial is no longer making the meeting weird enough.",
    "Interdimensional traffic detected. Customs confiscated two impossible angles and a childhood memory that was not yours.",
    "The visitor arrived from a universe where this conversation went well. It refuses to provide coordinates.",
    "Reality has developed a side entrance. The Bureau has chained it shut and posted an intern with a flashlight.",
  ]),
  biologics: Object.freeze([
    "Biologics recovered. Legal advises everyone to stop asking why the plural is doing so much work.",
    "“Non-human biologics” is Pentagon dialect for “something squishy; next question.”",
    "Bureau laboratory result: organic, non-human, and furious about the chain of custody.",
    "The sample was labeled BIOLOGICS because the evidence technician refused to write “alien bits” on a federal form.",
    "Biologics confirmed. The break-room refrigerator has been quarantined pending comparison.",
    "Call them bodies and the room panics; call them biologics and the paperwork stays seated.",
    "Non-human biologics recovered. Pathology described the sample as deceased, annoyed, and still above your clearance.",
    "The evidence bag moved during inventory. Legal has reclassified that as enthusiastic chain of custody.",
    "Biologics logged. The plural remains the most heavily armed word in the briefing.",
  ]),
  swamp_gas: Object.freeze([
    "Swamp gas has retained counsel and demands the government stop blaming it for every luminous object since 1966.",
    "Official assessment: swamp gas. Geographic assessment: there is no swamp within four hundred miles.",
    "The gas reflected Venus, violated restricted airspace, and apparently disabled three radar systems.",
    "Bureau field kit includes a spectrometer, a camera, and a prefilled form blaming the nearest wetland.",
    "If swamp gas can maneuver like that, the wetlands have achieved air superiority.",
    "Swamp gas explanation accepted. The swamp has been promoted and issued a security clearance.",
    "Swamp gas intercepted two fighters and returned home without visible propulsion. The marsh receives a medal Friday.",
    "Officially, it was swamp gas. Unofficially, the nearest swamp just retained a defamation attorney.",
    "The wetland denies involvement and has supplied radar data proving it was asleep at the time.",
  ]),
  balloon: Object.freeze([
    "Balloon detected. Threat assessment upgraded from “birthday” to “birthday with a radar signature.”",
    "The weather balloon is the official national bird of unexplained airspace.",
    "No propulsion, no transponder, and a suspiciously fresh receipt from the party store.",
    "The object survived radar lock but remains vulnerable to one child with a safety pin.",
    "Bureau recovery team popped it. Debris analysis reads “HAPPY 40TH, GARY.”",
    "If the explanation requires both balloon and swamp gas, the Bureau punches your loyalty card.",
    "Balloon confirmed. It accelerated against the wind because even party decorations are tired of the official story.",
    "NORAD tracked the object for six hours before Party City invoked diplomatic immunity.",
    "The Bureau recovered latex, string, and a payload containing one extremely classified birthday coupon.",
  ]),
  roswell: Object.freeze([
    "Roswell: one weather balloon, seventy-nine years of legal representation.",
    "The Bureau regrets the original flying-saucer announcement and the subsequent century of improvisation.",
    "Nothing happened at Roswell. Please ignore the armed men collecting every scrap of nothing.",
    "The Roswell file contains four explanations, three retractions, and one farmer who deserved overtime.",
    "If it was only a balloon, it was the first balloon to require generational damage control.",
    "Roswell tourism remains the only confirmed technology successfully reverse-engineered from the incident.",
    "Roswell update: the balloon has now outlived everyone who was ordered to keep calling it a balloon.",
    "The ranch debris was ordinary, which is why the military arrived immediately and behaved completely normal about it.",
    "One press release said saucer, the next said balloon, and the third was apparently eaten by national security.",
  ]),
  area_51: Object.freeze([
    "Area 51 detected. Area 50 remains furious about the skipped numbering.",
    "The base does not exist, but trespassers will be prosecuted by its heavily armed imaginary guards.",
    "Area 51 is where impossible aircraft become possible paperwork.",
    "The Bureau cannot confirm what is inside, except a gift shop opportunity the Air Force badly underestimated.",
    "Satellite view shows runways, hangars, and absolutely no reason to zoom in further.",
    "Area 51 access denied. Your Naruto run has been logged as hostile aerobatics.",
    "Area 51 does not exist. Its catering invoice, armed perimeter, and employee softball league are separate coincidences.",
    "The base contains experimental aircraft, alien metallurgy, and the government's most heavily classified break room.",
    "Your access request reached Groom Lake and was shot down before entering restricted airspace.",
  ]),
  orb: Object.freeze([
    `ORBS. ORBS! OH MY GOD—ORBS! GLORIOUS, LUMINOUS, CORNERLESS PERFECTION! Somebody summon the [Orb Archivist](${ORB_REFERENCE_URL}) before I rupture a federal artery.`,
    `EVERYBODY SHUT UP. SOMEONE SAID ORBS. Beautiful sky-marble angels are upon us, and the [Orb Archivist](${ORB_REFERENCE_URL}) must be notified immediately.`,
    `SWEET MERCIFUL GEOMETRY—THE ORBS HAVE RETURNED! Round, radiant, unknowable, and offensively magnificent. The [Orb Archivist](${ORB_REFERENCE_URL}) kept the faith when lesser shapes failed us.`,
    `THIS IS NOT A DRILL: ORBS! WONDERFUL, GLORIOUS, ORB-LIKE ORBS! Alert the [Orb Archivist](${ORB_REFERENCE_URL}); the age of corners is finally ending.`,
    `LOOK AT THEM. JUST LOOK AT THE ORBS. Perfect celestial meatballs of impossible light! The [Orb Archivist](${ORB_REFERENCE_URL}) was right to build a religion around this.`,
    `THE BUREAU HAS LOST CONTAINMENT. ORBS ARE EVERYWHERE—ROUND, RESPLENDENT, AND FREE OF THE TYRANNY OF EDGES. Get the [Orb Archivist](${ORB_REFERENCE_URL}) on the black phone NOW.`,
    `AT LAST: ORBS! I HAVE WAITED MY ENTIRE CLASSIFIED CAREER FOR THESE SHIMMERING SPHERES OF DESTINY. [Orb Archivist](${ORB_REFERENCE_URL}), your hour has come.`,
    `OH GOD, THEY ARE SO ROUND. SO BRIGHT. SO VIOLENTLY ORBULAR. Wake the [Orb Archivist](${ORB_REFERENCE_URL}); history has become a sphere.`,
    `I HAVE SEEN THINGS YOU PEOPLE WOULD NOT BELIEVE—AND NONE WERE AS MAJESTICALLY ORB-SHAPED AS THESE ORBS. The [Orb Archivist](${ORB_REFERENCE_URL}) has the sacred receipts.`,
  ]),
  tic_tac: Object.freeze([
    "Tic Tac detected. No wings, no exhaust, and apparently no interest in naval airspace etiquette.",
    "The Bureau offered the object a mint; it accelerated beyond the engagement envelope.",
    "White, oblong, and moving like physics had accepted a buyout.",
    "The Tic Tac has been clocked at several thousand knots and zero calories.",
    "Pilots reported impossible maneuvers. Marketing reported an extraordinary brand-placement opportunity.",
    "Tic Tac incident logged. Fresh breath remains the only conventional explanation not yet briefed to Congress.",
    "The Tic Tac dropped eighty thousand feet in seconds and still arrived fresher than the Pentagon's explanation.",
    "No wings, no exhaust, no control surfaces, and somehow a better naval résumé than everyone discussing it.",
    "The object ignored inertia, radar etiquette, and every attempt to determine whether it was orange flavored.",
  ]),
  mib: Object.freeze([
    "Men in Black detected. If the sedan is cleaner than your memory, do not accept the pen.",
    "MIB dress code: black suit, black tie, and one expression for every planetary emergency.",
    "The agents say they are from the government. Their eyebrows say the government is from somewhere else.",
    "Bureau tip: real Men in Black never validate parking and never explain the humming briefcase.",
    "Two agents arrived, asked impossible questions, and drank water like it was their first day with a mouth.",
    "Men in Black report filed. Witness description: overdressed, under-emotional, and catastrophically pale.",
    "MIB presence confirmed. Their credentials were flawless except for being issued tomorrow by a department that burned down in 1963.",
    "The men wore black, drove black, and spoke like somebody had taught a fax machine to threaten livestock.",
    "Two agents inspected the witness, the evidence, and the nearest reflective surface for signs of human behavior.",
  ]),
  neuralyzer: Object.freeze([
    "Neuralyzer detected. Please look at the red—no, not that end. This is why training exists.",
    "Memory sanitation scheduled. Backups, grudges, and browser history are not covered.",
    "The neuralyzer removes memories, not screenshots. The Bureau learned that distinction expensively.",
    "One flash erases an encounter; two flashes erase why the expense report is on fire.",
    "Neuralyzer charge low. You may remember the aliens but forget where you left your keys.",
    "The device is perfectly safe, according to everyone who no longer remembers the safety briefing.",
    "Neuralyzer armed. Please face the light and think about the last version of yourself that had plausible deniability.",
    "Memory wipe complete. Unfortunately, your personality was stored in a separate, nonrefundable partition.",
    "The flash removed twelve minutes, three passwords, and your strongest argument for remaining unsupervised.",
  ]),
  psyop: Object.freeze([
    "Psyop detected. If you noticed it, either it failed or you have entered phase two.",
    "Not every terrible opinion is a psyop. Some are locally sourced and artisanal.",
    "The Bureau's psyop budget was exhausted convincing people the algorithm was a research assistant.",
    "Operation successfully altered public opinion and accidentally created a ninety-four-part thread.",
    "The real psyop was making everyone believe reposting counted as independent verification.",
    "Please identify your handler, campaign objective, and preferred reaction GIF.",
    "Psyop confirmed. The operation achieved full-spectrum dominance over six people and a bot selling cryptocurrency.",
    "If this is psychological warfare, somebody forgot to requisition psychology.",
    "The campaign manipulated public opinion from confused to aggressively confused. Intelligence calls that measurable progress.",
  ]),
  nazca_mummies: Object.freeze([
    "Nazca mummy detected. Three fingers, zero passport, and an impossible carry-on allowance.",
    "The specimen has received more scans than most luggage and fewer universally accepted conclusions.",
    "Bureau pathology cannot distinguish ancient mystery from extremely committed craft project without an actual laboratory.",
    "The mummies declined comment because they are dry, deceased, and tired of livestreamed peer review.",
    "Peruvian customs would like to know why the alleged alien has better travel documentation than the evidence.",
    "Small body, enormous discourse footprint. The Bureau awaits peer review conducted somewhere other than a quote-post.",
    "Nazca specimen logged. Three fingers, one dramatic presentation case, and several laboratories avoiding eye contact.",
    "The mummy has survived centuries of desert exposure and may not survive another livestreamed press conference.",
    "Bureau examiners requested tissue provenance. The evidence team responded with louder PowerPoint transitions.",
  ]),
  trust_me_bro: Object.freeze([
    "“Trust me, bro” is not a citation; it is a confession that the evidence took the day off.",
    "The Bureau accepts “trust me, bro” at clearance level zero and evidentiary value negative one.",
    "Source: a dude familiar with another dude familiar with the matter.",
    "Every classified claim becomes true once “bro” enters the chain of custody.",
    "Your confidence is impressive. The supporting documentation remains abducted.",
    "Agent K has heard stronger sourcing from a fortune cookie in the evidence locker.",
    "Trust me, bro received. The Bureau has upgraded your source from imaginary to aggressively unverifiable.",
    "The phrase entered evidence without documents, witnesses, or the burden of shame.",
    "Your source is a guy whose cousin's handler once parked near a SCIF. Case closed incorrectly.",
  ]),
  majestic_12: Object.freeze([
    "MJ-12 detected. Eleven members deny it; the twelfth keeps operating the copier.",
    "Majestic Twelve: too secret for records, too famous for merchandise.",
    "The Bureau searched the roster and found twelve names, thirty-eight theories, and no agreed seating chart.",
    "Any committee calling itself “Majestic” has already failed the subtlety audit.",
    "The memo's typeface has been investigated more thoroughly than most congressional testimony.",
    "Majestic Twelve meeting postponed because nobody can agree whether the committee existed.",
    "MJ-12 roster confirmed: twelve members, thirteen denials, and one chair reserved for plausible deniability.",
    "The committee is so secret that every gift shop in Roswell knows its logo.",
    "Majestic paperwork detected. The signature is disputed, the content is explosive, and the margins have better clearance than you.",
  ]),
  chris_mellon: Object.freeze([
    "Chris Mellon reference logged. Somewhere, a classified organizational chart has begun sweating.",
    "Mellon enters the file with a measured tone, a tailored suit, and a question the Pentagon would prefer to misplace.",
    "If disclosure had a board meeting, Chris would already have the slides and somebody else's clearance.",
    "Bureau assessment: unusually calm for a man repeatedly asking the government where it parked the impossible aircraft.",
    "Mellon brings institutional credibility; the institution keeps pretending it stepped out for lunch.",
    "The Bureau respects Mellon's method: ask politely, document everything, then let the silence incriminate itself.",
    "Chris Mellon has requested the records again. The records have entered witness protection.",
    "Mellon brought another carefully sourced question to a building designed entirely out of evasive answers.",
    "The suit is calm, the timeline is documented, and somewhere inside the Pentagon a filing cabinet is hyperventilating.",
  ]),
  vallee: Object.freeze([
    "Vallée detected. Please choose: extraterrestrial, interdimensional, or folklore with flight characteristics.",
    "Jacques has entered the chat. The phenomenon is now stranger, older, and carrying a bibliography.",
    "The Bureau requested a simple theory. Vallée returned footnotes from five centuries and another continent.",
    "If it behaves like a spacecraft but reads like mythology, Jacques already filed it under “complicated.”",
    "Vallée does not connect dots; he interviews them across centuries until reality requests counsel.",
    "The case began with lights in the sky and ended with the Bureau questioning whether reality has a user interface.",
    "Vallée reviewed the landing trace and concluded the spaceship may be the least interesting part.",
    "Jacques found the same phenomenon wearing six religions, three costumes, and one deeply suspicious hat.",
    "The Bureau asked where the visitors came from. Vallée answered with a bibliography and a warning about asking spatial questions.",
  ]),
  hal_puthoff: Object.freeze([
    "Puthoff detected. Please retain all zero-point energy receipts for the interagency audit.",
    "Hal entered the briefing; conventional physics quietly checked the exits.",
    "The Bureau asked whether the vacuum contains usable energy. Hal asked how much clearance the vacuum has.",
    "The Puthoff file oscillates between classified physics and a grant proposal from another timeline.",
    "Remote viewing indicates Hal is about to mention a metric no one in the room can pronounce.",
    "We tried to audit zero-point energy. Accounting reported an infinite balance and resigned.",
    "Puthoff opened the vacuum and found it already billing the government by the hour.",
    "Hal's equations passed peer review in a timeline our security badges cannot currently access.",
    "The Bureau requested conventional physics. Puthoff returned the convention badge and kept the physics.",
  ]),
  eric_davis: Object.freeze([
    "Eric Davis reference logged. The memo has been copied, denied, leaked, debated, and still refuses to introduce itself.",
    "Davis entered the file; the equations are dense and the chain of custody is emotionally unavailable.",
    "Ask Eric a simple question and receive twelve dimensions plus a security caveat.",
    "The Bureau appreciates Davis's work because every answer generates three compartments and a conference panel.",
    "Eric Davis says the physics is difficult. Bureau translation: your podcast microphone is not a laboratory.",
    "The Davis file is not missing; it is merely present in a way the government cannot acknowledge.",
    "Eric Davis submitted another memo. Reality requested thirty days to prepare a response.",
    "The equations are internally consistent, externally classified, and personally offended by the comment section.",
    "Davis explained the mechanism clearly. The room understood every word individually and none of them together.",
  ]),
  lizard_people: Object.freeze([
    "Lizard people detected. Reptilian Affairs reminds all infiltrators to bask responsibly.",
    "The Bureau investigated the ruling reptiles. Most of them turned out to be ordinary landlords.",
    "Do not accuse a public figure without evidence of shedding, heat-lamp expenses, or tongue-related misconduct.",
    "The shape-shifter passed facial recognition but failed blink synchronization.",
    "Cold-blooded leadership is suspicious, but not proof of reptilian ancestry.",
    "Lizard-person report logged. Please identify scale pattern, preferred thermostat setting, and committee assignment.",
    "Reptilian infiltration confirmed. The suspect survived a Senate hearing without blinking or displaying mammalian warmth.",
    "The shape-shifter's human disguise passed inspection until someone lowered the thermostat and produced a heat lamp.",
    "Lizard people deny controlling society and request that all further questions be submitted through their banking subsidiaries.",
  ]),
  probe: Object.freeze([
    "Probe detected. Consent forms remain mandatory, even beyond Jupiter.",
    "If the saucer has mood lighting and a medical table, reconsider the complimentary tour.",
    "The Bureau reminds abductees that “for science” is not a complete consent protocol.",
    "The probe returned valuable data, most of it labeled “subject complained continuously.”",
    "No one in this channel has clearance for rear-facing telemetry.",
    "Agent K strongly advises against volunteering for any examination whose doctor entered through the ceiling.",
    "Probe reference logged. Medical assures us the procedure was exploratory; Legal refuses to specify what was explored.",
    "The instrument was sterile, extraterrestrial, and shaped by a species with an unnecessarily personal research agenda.",
    "Bureau aftercare includes hydration, memory suppression, and never accepting a free physical from a hovering disc.",
  ]),
});

export const DIRECT_ADLIB_BANKS = Object.freeze({
  openers: Object.freeze([
    "Agent K has acknowledged the summons.",
    "The black phone rang, and somehow it was your fault.",
    "A federal surveillance light just changed from bored to interested.",
    "Agent K stepped away from a functioning cover-up to review this.",
    "Your ping reached M.I.B. headquarters through channels best left medically unexplained.",
    "The Bureau's emergency printer coughed up your username and one human tooth.",
    "A neuralyzer activated itself when your message arrived.",
    "Agent K opened the file, then opened a second file for emotional support.",
    "The duty agent read your message and quietly removed the safety from the paperwork.",
    "Your communication has been intercepted, translated, and judged in all seven official mammal dialects.",
  ]),
  assessments: Object.freeze([
    "Your clearance appears decorative and may have been printed at a bowling alley.",
    "The message contains confidence, punctuation, and no detectable survival instinct.",
    "Preliminary scans classify you as mostly human and administratively exhausting.",
    "Your aura has the chain of custody of a gas-station hot dog.",
    "The Bureau recognizes your species but disputes the manufacturer's warranty.",
    "Your personnel file is sticky in places the Constitution did not anticipate.",
    "Psychological screening returned a drawing of a burning fax machine.",
    "You are displaying the tactical awareness of a Roomba trapped beneath a barstool.",
    "The scanner found three active conspiracies and none of them want credit for you.",
    "Your threat profile falls between unsecured luggage and a raccoon with diplomatic immunity.",
  ]),
  procedures: Object.freeze([
    "Remain still while we compare your skeleton against the federal loaner database.",
    "Keep both hands visible and any additional hands folded behind the primary set.",
    "Please state your business before the neuralyzer finishes warming up.",
    "Do not leave the channel; the exits are undergoing a routine reality inspection.",
    "Stand by while Agent K determines which version of your memory is least expensive to preserve.",
    "Face the red light and try to look like this was somebody else's idea.",
    "Submit one valid explanation, two forms of identification, and the name of your least convincing clone.",
    "Avoid sudden movements, sudden truths, and sudden attempts to monetize the encounter.",
    "Hold your position while the Bureau triangulates your remaining dignity.",
    "Answer carefully; the lie detector has been drinking and feels unusually confident.",
  ]),
  consequences: Object.freeze([
    "Noncompliance will be blamed on swamp gas and billed directly to your bloodline.",
    "Failure to cooperate results in memory sanitation and a deeply inaccurate obituary.",
    "Any resistance will be entered into evidence as interpretive dance.",
    "The Bureau may confiscate your browser history, alibi, and one load-bearing organ.",
    "Further nonsense upgrades this encounter from paperwork to educational violence.",
    "Your next mistake will receive a case number and limited theatrical release.",
    "If this becomes a containment event, your family will be told you joined improv.",
    "Continued hostility authorizes Agent K to replace your memories with regional furniture commercials.",
    "The official penalty is classified; the unofficial penalty has already parked outside.",
    "Cooperation earns a clean exit. Everything else earns a cleaner suit and a dirtier report.",
  ]),
});

export const DIRECT_ADLIB_TEMPLATES = Object.freeze([
  ({ opener, assessment, procedure, consequence }) =>
    `${opener} ${assessment} ${procedure} ${consequence}`,
  ({ opener, assessment, procedure }) =>
    `${opener} ${procedure} Initial finding: ${assessment}`,
  ({ opener, assessment, consequence }) =>
    `${opener} ${assessment} ${consequence}`,
  ({ assessment, procedure, consequence }) =>
    `Agent K's field assessment is complete. ${assessment} ${procedure} ${consequence}`,
  ({ opener, procedure, consequence }) =>
    `${opener} Standard protocol follows: ${procedure} ${consequence}`,
  ({ assessment, procedure }) =>
    `${assessment} Agent K recommends one immediate corrective measure: ${procedure}`,
]);

export const SHARED_TOPIC_ADLIB_BANKS = Object.freeze({
  actions: Object.freeze([
    "Agent K has opened a sealed inquiry and an unsealed bottle of antacid.",
    "The Bureau dispatched a clean sedan, two dirty agents, and one intern marked expendable.",
    "All related evidence has been moved somewhere Congress cannot pronounce.",
    "M.I.B. analysts are enlarging the pixels until one of them confesses.",
    "The file has been transferred to the department that investigates impossible claims and possible idiots.",
    "A containment team is en route with zip ties, redactions, and no adult supervision.",
    "Headquarters ordered surveillance, plausible deniability, and enough coffee to violate a treaty.",
    "The evidence locker has been cleared of everything except the evidence and several armed raccoons.",
    "Agent K requested a second opinion; the second opinion requested witness protection.",
    "The Bureau has begun the traditional response: deny, classify, leak, and blame weather.",
  ]),
  verdicts: Object.freeze([
    "Preliminary verdict: technically possible, operationally embarrassing.",
    "Official finding: anomalous enough for a hearing, coherent enough for half a podcast.",
    "The evidence is compelling, contaminated, and wearing somebody else's fingerprints.",
    "Analysts rate the claim seventy percent unexplained and thirty percent aggressively unemployed.",
    "The file survives basic scrutiny but not contact with the procurement department.",
    "Sensor confidence is high; confidence in the people holding the sensors is substantially lower.",
    "The phenomenon appears genuine. The explanation appears to have been assembled during a fire drill.",
    "Bureau consensus remains impossible, which is the closest this agency gets to confirmation.",
    "The facts are classified, the vibes are admissible, and the PowerPoint is facing charges.",
    "Assessment complete: reality misbehaved and management would like the footage deleted.",
  ]),
  consequences: Object.freeze([
    "Three careers will now disappear into administrative weather.",
    "The nearest senator has been issued a briefing and a fresh reason to regret literacy.",
    "Public Affairs will call it routine immediately after bleaching the runway.",
    "Everyone involved has been promoted, reassigned, or declared a lens artifact.",
    "The truth will be released after it is no longer useful, fashionable, or alive.",
    "Taxpayers will cover the cleanup while being informed there was nothing to clean.",
    "The witness will receive counseling, surveillance, and a coupon that expired in 1987.",
    "Any surviving evidence will be adapted into a documentary before entering peer review.",
    "The responsible office has denied jurisdiction and quietly ordered larger locks.",
    "History will remember this incorrectly, exactly as designed.",
  ]),
});

export const TOPIC_ADLIBS = Object.freeze({
  classified: Object.freeze({
    label: "CLASSIFIED",
    details: Object.freeze([
      "The document is redacted so heavily the black ink now qualifies as structural support.",
      "Your clearance request was rejected by a laminator with better operational judgment.",
      "The file contains twelve secrets and one handwritten warning not to let you near nouns.",
      "Even the table of contents has been placed in witness protection.",
      "The security compartment is accessible only to personnel who know what a PDF is.",
    ]),
  }),
  uap: Object.freeze({
    label: "UAP",
    details: Object.freeze([
      "The target changed speed without propulsion and direction without consulting inertia.",
      "Three sensor systems agreed until an official explanation entered the room.",
      "The object performed six impossible maneuvers and one perfectly timed insult to aviation safety.",
      "Radar tracked the contact clearly; the released footage was apparently filmed through soup.",
      "The craft hovered over restricted airspace like it had already read the trespassing policy.",
    ]),
  }),
  uapgerb: Object.freeze({
    label: "UAPGERB",
    details: Object.freeze([
      "Gerb enhanced the footage until the pixels developed testimony and union representation.",
      "The evidence burrow now contains twelve flight paths and one deeply suspicious sunflower seed.",
      "A blurry object entered Gerb's workstation and left with a case number.",
      "Gerb has classified the exercise wheel as a high-speed analytic centrifuge.",
      "The video survived stabilization, enlargement, and a twelve-minute interrogation by a diagram.",
    ]),
  }),
  elizondo: Object.freeze({
    label: "ELIZONDO",
    details: Object.freeze([
      "Lue has located disclosure directly behind the next podcast appearance.",
      "The soul patch registered another enormous claim and declined to release supporting telemetry.",
      "A world-changing revelation has been placed on a payment plan called soon.",
      "The NDA is reportedly so tight it has begun affecting nearby neckties.",
      "The promised evidence remains two weeks away in a calendar system unique to book promotion.",
    ]),
  }),
  ufo: Object.freeze({
    label: "UFO",
    details: Object.freeze([
      "The craft flew, remained an object, and resisted every attempt to make the acronym less interesting.",
      "The saucer ignored air traffic control and requested directions to a species with better management.",
      "Witnesses reported lights, silence, and the sudden arrival of men who hate follow-up questions.",
      "The object declined identification on the grounds that our planet looked temporary.",
      "A metallic disc crossed the valley and left local skepticism requiring bodywork.",
    ]),
  }),
  disclosure: Object.freeze({
    label: "DISCLOSURE",
    details: Object.freeze([
      "The release schedule has been delayed by hearings about previous delays to the release schedule.",
      "Every useful paragraph was replaced by a black rectangle with qualified immunity.",
      "The truth reached the podium and was immediately escorted back into a basement.",
      "Transparency officials confirmed the existence of light but declined to open the blinds.",
      "Full disclosure remains imminent under a definition of imminent licensed from geology.",
    ]),
  }),
  nhi: Object.freeze({
    label: "NON-HUMAN INTELLIGENCE",
    details: Object.freeze([
      "The entity demonstrated advanced cognition by muting the channel before anyone tagged it.",
      "Non-human intelligence was confirmed; the control sample from management remains inconclusive.",
      "The visitor solved interstellar travel and still could not understand the server's role hierarchy.",
      "The species communicates telepathically and has already left everyone here on read.",
      "The intelligence is definitely non-human because it reviewed the evidence before forming an opinion.",
    ]),
  }),
  whistleblower: Object.freeze({
    label: "WHISTLEBLOWER",
    details: Object.freeze([
      "The source brought medals, credentials, and a document-shaped absence.",
      "Testimony arrived under oath while the supporting attachments remained under new management.",
      "The whistle is loud, the résumé is decorated, and the chain of custody is on vacation.",
      "A source familiar with the matter remains unfamiliar with producing the matter.",
      "The witness risked a career to reveal information currently available only on the speaking tour.",
    ]),
  }),
  crash_retrieval: Object.freeze({
    label: "CRASH RETRIEVAL",
    details: Object.freeze([
      "The vehicle landed through several pieces of itself and one federal jurisdiction.",
      "Recovery teams collected exotic alloy, scorched soil, and a farmer's remaining patience.",
      "The occupants declined medical assistance and requested a tow company outside spacetime.",
      "Debris demonstrated memory, tensile strength, and an active dislike of evidence bags.",
      "The crash site expanded by forty acres whenever a reporter approached.",
    ]),
  }),
  reverse_engineering: Object.freeze({
    label: "REVERSE ENGINEERING",
    details: Object.freeze([
      "Researchers reproduced the warning light while losing the propulsion system completely.",
      "The alloy obeyed physics until the contractor submitted an invoice.",
      "Engineers found no controls, no fuel, and one interface labeled for a hand humans do not own.",
      "The recovered device generates limitless energy and quarterly budget overruns.",
      "Eighty years of study produced a humming conference table and several classified divorces.",
    ]),
  }),
  ontological_shock: Object.freeze({
    label: "ONTOLOGICAL SHOCK",
    details: Object.freeze([
      "Your worldview encountered additional terms and conditions without accepting them.",
      "Reality expanded faster than your belief system's emergency-management plan.",
      "The universe revealed a basement and your ontology was stored directly beneath it.",
      "Existence issued a patch that removed human centrality and several comforting menu options.",
      "The subject learned one true fact and immediately began using paradigm as a weapon.",
    ]),
  }),
  interdimensional: Object.freeze({
    label: "INTERDIMENSIONAL CONTACT",
    details: Object.freeze([
      "The visitor declared three dimensions and concealed eight more in a carry-on.",
      "A portal opened into a universe where this investigation already failed more elegantly.",
      "The entity arrived sideways through causality and parked in a childhood memory.",
      "Customs found two impossible angles taped beneath the traveler's reality.",
      "The signal originates from a location described only as adjacent to Tuesday.",
    ]),
  }),
  biologics: Object.freeze({
    label: "NON-HUMAN BIOLOGICS",
    details: Object.freeze([
      "The sample is organic, non-human, and represented by counsel.",
      "Pathology counted several organs and none agreed on which creature they belonged to.",
      "The biologics remained deceased until inventory, when they became administratively active.",
      "The plural in biologics is carrying more classified weight than the recovery aircraft.",
      "The specimen has unusual DNA and a completely ordinary government evidence label attached backward.",
    ]),
  }),
  swamp_gas: Object.freeze({
    label: "SWAMP GAS",
    details: Object.freeze([
      "The nearest wetland is four hundred miles away and has supplied a notarized alibi.",
      "The gas achieved radar lock, transmedium travel, and a commanding lead in the arms race.",
      "Venus reflected off the marsh until three aircraft lost instrumentation.",
      "The swamp has retained counsel after decades of involuntary explanatory service.",
      "A luminous vapor violated restricted airspace and returned to the bog with combat pay.",
    ]),
  }),
  balloon: Object.freeze({
    label: "BALLOON",
    details: Object.freeze([
      "The party decoration crossed three defense sectors and ignored a direct order to celebrate responsibly.",
      "Recovered debris includes latex, string, and a birthday message redacted for national security.",
      "The object lacked propulsion but possessed surprisingly aggressive strategic intent.",
      "Weather data denies knowing the balloon and requests separate legal representation.",
      "The target survived radar tracking but remains vulnerable to one motivated toddler.",
    ]),
  }),
  roswell: Object.freeze({
    label: "ROSWELL",
    details: Object.freeze([
      "The balloon explanation now requires more maintenance than the alleged spacecraft.",
      "The military recovered ordinary debris using extraordinary quantities of armed secrecy.",
      "One press release found a saucer; the next found a vocabulary problem.",
      "The ranch produced foil, sticks, and seventy-nine years of increasingly expensive denial.",
      "Every witness changed their story after receiving a private lesson in federal consistency.",
    ]),
  }),
  area_51: Object.freeze({
    label: "AREA 51",
    details: Object.freeze([
      "The nonexistent base has requested additional funding for its imaginary armed perimeter.",
      "Satellite imagery shows runways, hangars, and a gift shop opportunity hidden from Congress.",
      "Experimental aircraft are tested beside experiments that object to being called aircraft.",
      "Groom Lake denied your access request before you finished spelling access.",
      "The cafeteria serves three mammalian diets and one tray marked visiting management.",
    ]),
  }),
  orb: Object.freeze({
    label: "ORBS! ORBS! OH MY GOD, ORBS",
    details: Object.freeze([
      `Glorious luminous spheres have descended, and the [Orb Archivist](${ORB_REFERENCE_URL}) must bear witness before the Bureau dies from joy.`,
      `The sky is pregnant with perfect, radiant ORBS; the [Orb Archivist](${ORB_REFERENCE_URL}) was right and every corner on Earth now looks pathetic.`,
      `Roundness has achieved divinity—beautiful, throbbing celestial ORBS everywhere! Summon the [Orb Archivist](${ORB_REFERENCE_URL}) immediately.`,
      `The ORBS are magnificent, the ORBS are unknowable, and the ORBS have made geometry worth living for. The [Orb Archivist](${ORB_REFERENCE_URL}) kept the sacred record.`,
      `OH GOD, THESE WONDERFUL ORB-LIKE ORBS ARE SO PERFECTLY ORBULAR. Wake the [Orb Archivist](${ORB_REFERENCE_URL}); prophecy has become spherical.`,
    ]),
  }),
  tic_tac: Object.freeze({
    label: "TIC TAC",
    details: Object.freeze([
      "The object descended eighty thousand feet while conventional aircraft were still clearing their throats.",
      "No wings, no exhaust, and no apparent concern for naval performance reviews.",
      "The target accelerated beyond interception and retained zero calories.",
      "Physics attempted pursuit and was left outside the engagement envelope.",
      "The craft displayed impossible maneuverability and excellent brand recognition.",
    ]),
  }),
  mib: Object.freeze({
    label: "MEN IN BLACK",
    details: Object.freeze([
      "Two agents displayed credentials issued tomorrow by an office abolished yesterday.",
      "The sedan was immaculate, the questions were impossible, and the passengers blinked in committee.",
      "Witnesses described black suits, pale skin, and customer-service behavior learned from insects.",
      "The agents drank water like it contained advanced mechanical instructions.",
      "Every reflective surface in the room became nervous at the same time.",
    ]),
  }),
  neuralyzer: Object.freeze({
    label: "NEURALYZER",
    details: Object.freeze([
      "The flash removed the encounter but preserved the emotional damage for training purposes.",
      "Memory sanitation succeeded except for screenshots, resentment, and one smell from the ship.",
      "The device erased twelve minutes and accidentally restored a worse childhood.",
      "Battery level is low, so subjects may remember the aliens but forget basic bathroom geography.",
      "The safety briefing disappeared during the safety demonstration.",
    ]),
  }),
  psyop: Object.freeze({
    label: "PSYOP",
    details: Object.freeze([
      "The influence campaign converted public confusion into monetized public confusion.",
      "Operation targets include six voters, three bots, and one man already arguing with a parking meter.",
      "The narrative was seeded organically by forty identical accounts created during lunch.",
      "Psychological warfare was approved despite the documented absence of psychology.",
      "Phase two begins when participants congratulate themselves for noticing phase one.",
    ]),
  }),
  nazca_mummies: Object.freeze({
    label: "NAZCA MUMMIES",
    details: Object.freeze([
      "The specimen has three fingers, no passport, and a presentation case with better lighting than the laboratory.",
      "Ancient tissue survived the desert and immediately entered a modern custody dispute.",
      "The mummy received twelve scans and zero mutually compatible press conferences.",
      "Peruvian customs identified the body as deceased and the export paperwork as spiritually active.",
      "Peer review remains scheduled directly after the next dramatic box opening.",
    ]),
  }),
  trust_me_bro: Object.freeze({
    label: "TRUST ME, BRO",
    details: Object.freeze([
      "The claim arrived without evidence because evidence was apparently told to meet us there.",
      "Your source's cousin once parked near a man who mispronounced SCIF.",
      "Confidence has exceeded the legal carrying capacity of the documentation.",
      "Chain of custody begins with bro and terminates inside a monetized thread.",
      "The citation is a nod delivered by someone facing away from the facts.",
    ]),
  }),
  majestic_12: Object.freeze({
    label: "MAJESTIC 12",
    details: Object.freeze([
      "The committee has twelve alleged members and enough denials for a much larger table.",
      "The memo's typeface remains more thoroughly investigated than its national-security implications.",
      "A seating chart was recovered containing eleven names and one black rectangle with voting rights.",
      "The organization is too secret for records and too famous for tasteful merchandise.",
      "Every signature is disputed except the one authorizing additional secrecy.",
    ]),
  }),
  chris_mellon: Object.freeze({
    label: "CHRIS MELLON",
    details: Object.freeze([
      "Another calm question entered the Pentagon and returned with its pockets searched.",
      "Mellon brought documentation to an institution constructed entirely from missing attachments.",
      "A classified organizational chart began sweating when his name reached the agenda.",
      "The request was professional, specific, and therefore impossible for the building to process.",
      "Institutional credibility arrived wearing a suit; the institution escaped through a service entrance.",
    ]),
  }),
  vallee: Object.freeze({
    label: "JACQUES VALLÉE",
    details: Object.freeze([
      "The phenomenon appeared as spacecraft, folklore, and a footnote nobody should read alone.",
      "A simple extraterrestrial theory entered the archive and emerged carrying five centuries of witnesses.",
      "The landing trace may be physical, psychic, symbolic, or all three before lunch.",
      "Vallée interviewed the dots until they admitted the line was the suspicious part.",
      "The case began in the sky and ended with reality refusing to produce identification.",
    ]),
  }),
  hal_puthoff: Object.freeze({
    label: "HAL PUTHOFF",
    details: Object.freeze([
      "The vacuum contains unlimited energy and several invoices the Bureau refuses to open.",
      "Conventional physics checked the exits when the briefing projector turned on.",
      "A zero-point calculation produced infinite power and insufficient grant documentation.",
      "Remote viewing located the answer inside a compartment accounting cannot perceive.",
      "The experiment obeyed every law except the ones taught before lunch.",
    ]),
  }),
  eric_davis: Object.freeze({
    label: "ERIC DAVIS",
    details: Object.freeze([
      "The memo exists in a state best described as classified superposition.",
      "A simple question returned with twelve dimensions and a security escort.",
      "The equations are consistent; the agencies have agreed to remain neither.",
      "Every answer generated three compartments and one conference invitation.",
      "The physics is difficult, the sourcing is disputed, and the PDF has stopped taking calls.",
    ]),
  }),
  lizard_people: Object.freeze({
    label: "LIZARD PEOPLE",
    details: Object.freeze([
      "The suspect passed facial recognition and failed room-temperature mammal protocol.",
      "Reptilian Affairs denies infiltration while approving three new heat-lamp appropriations.",
      "The human disguise is convincing except during shedding season and budget negotiations.",
      "Cold-blooded leadership remains circumstantial until somebody checks beneath the committee table.",
      "The ruling reptiles have denied everything through their wholly owned terrestrial landlords.",
    ]),
  }),
  probe: Object.freeze({
    label: "PROBE",
    details: Object.freeze([
      "The instrument is extraterrestrial, sterile, and designed with unacceptable confidence.",
      "Medical describes the procedure as exploratory while refusing to identify the explored jurisdiction.",
      "The subject signed consent in a language consisting entirely of blinking lights.",
      "Telemetry was recovered from a direction the Bureau has declined to illustrate.",
      "Aftercare includes hydration, neuralyzation, and avoiding free examinations delivered by tractor beam.",
    ]),
  }),
});

export const TOPIC_ADLIB_TEMPLATES = Object.freeze([
  ({ label, detail, action, verdict, consequence }) =>
    `${label} flag raised. ${detail} ${verdict} ${action} ${consequence}`,
  ({ label, detail, verdict, consequence }) =>
    `Agent K reopened the ${label} file. ${detail} ${verdict} ${consequence}`,
  ({ label, detail, action }) =>
    `${label} detected. ${detail} ${action}`,
  ({ label, detail, action, consequence }) =>
    `Bureau note regarding ${label}: ${detail} ${action} ${consequence}`,
  ({ label, detail, verdict }) =>
    `${label} analysis complete. ${detail} ${verdict}`,
  ({ label, detail, action, verdict }) =>
    `The ${label} desk has issued a finding. ${detail} ${action} ${verdict}`,
]);

const TOPIC_PATTERNS = Object.freeze([
  ["classified", /\bclassified\b/i],
  ["uap", /\buaps?\b/i],
  ["uapgerb", /\b(?:uap[-_\s]?gerb|gerb)\b/i],
  ["elizondo", /\b(?:lue(?:\s+elizondo)?|elizondo)\b/i],
  ["ufo", /\bufos?\b/i],
  ["disclosure", /\b(?:catastrophic\s+)?disclosure\b/i],
  ["nhi", /\b(?:nhi|non[-\s]+human intelligence)\b/i],
  ["whistleblower", /\bwhistle[-\s]?blowers?\b/i],
  [
    "crash_retrieval",
    /\b(?:crash[-\s]+retrievals?|retrieval programs?)\b/i,
  ],
  ["reverse_engineering", /\breverse[-\s]+engineer(?:ed|ing)?\b/i],
  ["ontological_shock", /\bontological shocks?\b/i],
  ["interdimensional", /\binter[-\s]?dimensional\b/i],
  ["biologics", /\bbiologics?\b/i],
  ["swamp_gas", /\bswamp gas\b/i],
  ["balloon", /\bballoons?\b/i],
  ["roswell", /\broswell\b/i],
  ["area_51", /\barea[-\s]?51\b/i],
  ["orb", /\borbs?\b/i],
  ["tic_tac", /\btic[-\s]?tacs?\b/i],
  ["mib", /\b(?:mib|men in black)\b/i],
  ["neuralyzer", /\bneural[yi]zers?\b/i],
  ["psyop", /\bpsy[-\s]?ops?\b/i],
  [
    "nazca_mummies",
    /\b(?:(?:nazca|alien|peruvian)\s+mumm(?:y|ies))\b/i,
  ],
  ["trust_me_bro", /\btrust me,?\s+bro\b/i],
  [
    "majestic_12",
    /\b(?:majestic[-\s]+(?:12|twelve)|mj[-\s]?12)\b/i,
  ],
  ["chris_mellon", /\bchris(?:topher)?\s+mel{1,2}on\b/i],
  ["vallee", /\b(?:jacques\s+)?vall(?:e|é)e\b/i],
  ["hal_puthoff", /\b(?:(?:hal|harold)\s+)?puthof{1,2}\b/i],
  ["eric_davis", /\b(?:dr\.?\s+)?eric(?:\s+w\.?)?\s+davis\b/i],
  ["lizard_people", /\blizard (?:person|people)\b/i],
  ["probe", /\b(?:probes?|probed|probing)\b/i],
]);

export function matchingTopics(content) {
  return TOPIC_PATTERNS.filter(([, pattern]) => pattern.test(content)).map(
    ([topic]) => topic,
  );
}

function choose(values, randomIndex) {
  return values[randomIndex(values.length)];
}

export class ResponseHistory {
  constructor() {
    this.recentItems = new Map();
    this.recentOutputs = [];
  }

  choose(key, values, randomIndex) {
    const recent = this.recentItems.get(key) ?? [];
    const recentValues = new Set(recent);
    const available = values.filter((value) => !recentValues.has(value));
    const source = available.length > 0 ? available : values;
    const selected = choose(source, randomIndex);
    recent.push(selected);
    while (recent.length > 5) {
      recent.shift();
    }
    this.recentItems.set(key, recent);
    return selected;
  }

  hasOutput(output) {
    return this.recentOutputs.includes(output);
  }

  recordOutput(output) {
    this.recentOutputs.push(output);
    while (this.recentOutputs.length > 10) {
      this.recentOutputs.shift();
    }
  }
}

function generateDirectAdlib(history, randomIndex) {
  const values = Object.fromEntries(
    Object.entries(DIRECT_ADLIB_BANKS).map(([key, bank]) => [
      key.slice(0, -1),
      history.choose(`direct:${key}`, bank, randomIndex),
    ]),
  );
  const template = history.choose(
    "direct:template",
    DIRECT_ADLIB_TEMPLATES,
    randomIndex,
  );
  return template(values);
}

function generateTopicAdlib(topic, history, randomIndex) {
  const topicBank = TOPIC_ADLIBS[topic];
  const template = history.choose(
    `topic:${topic}:template`,
    TOPIC_ADLIB_TEMPLATES,
    randomIndex,
  );
  return template({
    label: topicBank.label,
    detail: history.choose(
      `topic:${topic}:detail`,
      topicBank.details,
      randomIndex,
    ),
    action: history.choose(
      "topic:shared:action",
      SHARED_TOPIC_ADLIB_BANKS.actions,
      randomIndex,
    ),
    verdict: history.choose(
      "topic:shared:verdict",
      SHARED_TOPIC_ADLIB_BANKS.verdicts,
      randomIndex,
    ),
    consequence: history.choose(
      "topic:shared:consequence",
      SHARED_TOPIC_ADLIB_BANKS.consequences,
      randomIndex,
    ),
  });
}

export function createAgentResponseSelector(
  randomIndex = randomInt,
  history = new ResponseHistory(),
) {
  return ({ content = "", isDirect = false }) => {
    let kind;
    let build;
    if (isDirect) {
      kind = "direct";
      build = () =>
        randomIndex(2) === 0
          ? history.choose("direct:prepared", DIRECT_RESPONSES, randomIndex)
          : generateDirectAdlib(history, randomIndex);
    } else {
      const topics = matchingTopics(content);
      if (topics.length === 0) {
        return null;
      }
      const topic = history.choose("topic:match", topics, randomIndex);
      kind = topic;
      build = () =>
        randomIndex(2) === 0
          ? history.choose(
              `topic:${topic}:prepared`,
              TOPIC_RESPONSES[topic],
              randomIndex,
            )
          : generateTopicAdlib(topic, history, randomIndex);
    }

    let response = build();
    for (
      let attempt = 1;
      attempt < 6 && history.hasOutput(response);
      attempt += 1
    ) {
      response = build();
    }
    history.recordOutput(response);
    return { kind, response };
  };
}

export function selectAgentResponse(
  { content = "", isDirect = false },
  randomIndex = randomInt,
) {
  return createAgentResponseSelector(randomIndex)({ content, isDirect });
}
