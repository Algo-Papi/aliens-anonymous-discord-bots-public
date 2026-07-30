import { randomInt } from "node:crypto";

const LOW_ALTITUDE_CHARGES = Object.freeze([
  "Vertical disrespect toward a compact official",
  "Unauthorized speculation about classified stature",
  "Possession of an unlicensed short joke",
  "Punching down and somehow still missing",
  "Trafficking in low-hanging fruit",
  "Aggravated altitude commentary",
  "Mockery below the legal height limit",
  "Disseminating restricted height intelligence",
  "Interference with a Short King operation",
  "First-degree vertical slander",
  "Attempted measurement of a government asset",
  "Operating a joke without sufficient clearance",
  "Malicious use of the word tiny",
  "Conspiracy to diminish command presence",
  "Failure to respect concentrated authority",
  "Reckless comparison to household furniture",
  "Unauthorized booster-seat propaganda",
  "Loitering in restricted lower airspace",
  "Height-based insubordination",
  "Possession of a counterfeit growth chart",
  "Disrespecting a vertically efficient moderator",
  "Unlawful distribution of compact allegations",
  "Terrestrial bias against low-orbit leadership",
  "Crimes against the Short King Protection Act",
]);

const LOW_ALTITUDE_SENTENCES = Object.freeze([
  "Three minutes under ankle-height surveillance",
  "One mandatory booster-seat inspection",
  "Immediate transfer to the kiddie-table tribunal",
  "Suspension of all altitude privileges",
  "Community service polishing the top shelf",
  "Seven orbits in the Galactic Shame Capsule",
  "Mandatory sensitivity training for tall people",
  "Confiscation of one inch from your official record",
  "Probation until the mod reaches the top shelf",
  "A formal apology delivered from one knee",
  "Permanent placement on the low-orbit watchlist",
  "One week of supervised limbo practice",
  "Assignment to the Department of Tiny Affairs",
  "Reeducation at the Compact Command Academy",
  "A fine of twelve regulation step stools",
  "Heightened scrutiny with no actual height",
  "Immediate calibration by the booster-seat bureau",
  "Exile to a planet with aggressive gravity",
  "Ninety days in the miniature witness program",
  "Loss of tall-person privileges until further notice",
  "Compulsory service in the Galactic Footstool Corps",
  "Public classification as vertically suspicious",
  "Remand to the ankle-monitoring division",
  "Case review once the evidence can reach the counter",
]);

const BERBERPHOBIA_CHARGES = Object.freeze([
  "Felony possession of a dogshit Berberphobic opinion",
  "First-degree Amazigh erasure with intent to sound educated",
  "Operating a stereotype without a license, insurance, or functioning brain",
  "Aggravated cultural illiteracy with intent to post",
  "Trafficking in counterfeit North African expertise",
  "Smuggling colonial fanfiction into a factual conversation",
  "Laundering a Facebook meme as legitimate geopolitics",
  "Reckless discharge of the phrase “those people”",
  "Attempted racism enhanced by room-temperature intelligence",
  "Impersonating a historian while barely surviving the Wikipedia introduction",
  "Excessive confidence under the influence of an algorithm",
  "Failure to distinguish North Africa from some shit the defendant invented",
  "Unlicensed cultural reductionism resulting in severe secondhand embarrassment",
  "Conspiracy to compress an entire civilization into one shitty joke",
  "Obstruction of context, resisting facts, and fleeing follow-up questions",
  "Malicious misuse of “actually” while demonstrably full of shit",
  "Repeat offense: being loud, wrong, and inexplicably proud of both",
  "Serving reheated colonialism with a side order of denial",
  "Contaminating the channel with a take too stupid for terrestrial origin",
  "Continuing to post after common sense had clearly evacuated the premises",
]);

const BERBERPHOBIA_SENTENCES = Object.freeze([
  "Clearance downgraded to DUMBASS WHO SHOULD HAVE STAYED QUIET",
  "Sentenced to defend the original take before three Amazigh aunties; the Bureau assumes no responsibility for the verbal consequences",
  "Everyone except the defendant receives a neuralyzer flash",
  "All opinions confiscated until the defendant's brain catches up with their mouth",
  "Autocorrect will append “Source: I pulled this directly from my ass” to every future claim",
  "Fitted with an ankle monitor that announces “Citation needed, dumbass” whenever confidence exceeds knowledge",
  "Sentenced to hear the original argument read slowly and sarcastically before a live audience",
  "Assigned an Amazigh grandmother as probation officer, fact-checker, and emergency contact",
  "Required to wear a Bureau badge reading CULTURALLY UNSUPERVISED",
  "Sentenced to the cruel and unusual punishment of researching something before speaking",
  "All future takes must be approved by someone who has finished a book",
  "Internet connection throttled to the speed of the defendant's intellectual development",
  "Reassigned indefinitely to the Bureau's Department of Shutting the Fuck Up",
  "Sentenced to community service cleaning their bullshit out of the cultural discourse",
  "Every use of “actually” will trigger the public release of the defendant's reading level",
  "Passport stamped INTERNATIONALLY EMBARRASSING",
  "Ordered to return all stolen nuance and apologize for the condition it came back in",
  "Confined to a group chat where everyone shares the defendant's opinions—considered sufficient punishment by the Geneva Convention",
  "Sentenced to lose an argument against a museum placard",
  "Sentence suspended provided the defendant deletes the draft, drinks some water, and touches grass immediately",
]);

const MINORITY_VIOLATION_CHARGES = Object.freeze([
  "Declaring another person's ethnicity a code violation because the defendant's worldview has one setting: suburban beige",
  "Attempting to deport someone from a group chat the defendant does not own",
  "Reporting melanin to the Bureau as unregistered contraband",
  "Operating a homemade border checkpoint between general chat and the meme channel",
  "Demanding federal obedience while brandishing a cafeteria monitor badge",
  "Mistaking demographic existence for a coordinated attack on the defendant's comfort",
  "Filing a civil-rights complaint because equality failed to center the defendant",
  "Counterfeit supremacy aggravated by hall-monitor energy",
  "Calling representation an invasion after seeing two nonwhite people in the same franchise",
  "Attempting a citizen's arrest on a language the defendant could not pronounce",
  "Weaponizing “tradition” as an alibi for acting like a federally licensed asshole",
  "Conducting racial profiling with one shared brain cell and no probable cause",
  "Treating seasoning, bilingualism, and basic rhythm as signs of foreign interference",
  "Submitting a demographic threat assessment based entirely on vibes and an uncle's Facebook page",
  "Confusing loss of automatic deference with systematic oppression",
  "Demanding cultural identification papers during an argument about cartoons",
  "Calling equal treatment preferential treatment with premeditated victim cosplay",
  "Building a tiny dictatorship because somebody different refused to validate the tantrum",
  "Trying to segregate the lunch table without ownership of a table, lunch, or friends",
  "Continuing a minority panic after Bureau agents confirmed the alleged threat was just a person existing",
]);

const MINORITY_VIOLATION_SENTENCES = Object.freeze([
  "Plastic authority badge confiscated and replaced with a laminated card reading NOT IN CHARGE",
  "Sentenced to explain civil rights to a school counselor while three adults grade the vocabulary",
  "Every future use of “those people” automatically expands to “people who make me irrationally insecure”",
  "Deported from the conversation the defendant attempted to colonize",
  "Mandatory diversity training administered by everyone the defendant interrupted",
  "All racist dog whistles replaced with a literal kazoo until subtlety improves",
  "Ordered to repeat “I was contradicted, not oppressed” before filing another grievance",
  "Imaginary border wall, plastic sheriff badge, and Facebook law degree permanently confiscated",
  "Confined to the Bureau's Juvenile Supremacy Wing with no snacks after lights-out",
  "Forty hours serving food from the culture insulted, with pronunciation tested at the door",
  "Privilege card declined until the defendant completes one conversation without making equality about them",
  "Assigned a caseworker whose only response to demographic panic is “And how is that your business?”",
  "Required to share a lunch table, a factual source, and eventually the planet",
  "Every claim of reverse oppression accompanied by the world's smallest government-issued violin",
  "Ordered to respect the authority of the nearest person who has finished a history book",
  "All future border policy proposals restricted to the defendant's own bedroom doorway",
  "Sentenced to a museum field trip with the gift shop closed until one fact is retained",
  "Probation supervised by a disappointed school principal and the concept of basic decency",
  "Required to submit Form CRT-MANBABY before criminalizing anyone else's existence",
  "Parole eligibility begins after one full week without treating another person's identity as a personal emergency",
]);

const MINORITY_VIOLATION_FINDINGS = Object.freeze([
  "Bureau scans found 98 percent authoritarian tantrum and 2 percent cafeteria-grade policy.",
  "No minority violation was detected; the subject merely encountered a minority.",
  "The defendant confused reduced dominance with active persecution.",
  "The alleged border was imaginary. The audacity was independently confirmed.",
  "Authority tested as plastic and appears to have been purchased near a Halloween aisle.",
  "Civil rights remained intact; the defendant's ego suffered catastrophic damage.",
  "The alleged threat was a person existing without first requesting the defendant's comfort.",
  "Background checks recovered three grievances and no completed history book.",
  "Victimhood claim denied: evidence shows the defendant was asked to stop being a dick.",
  "Contraband hall-monitor energy was recovered from every pocket.",
]);

const BROSEXUAL_CHARGES = Object.freeze([
  "Felony possession of another man's exact inseam measurements without operational need",
  "Saying “nice cock” with the confidence of a court-certified appraiser",
  "Aggravated use of “no homo” after the statutory filing deadline",
  "Rewinding the shirtless scene twice while yelling “pause” at the television",
  "Calling the homie “breedable” and attempting to invoke satire immunity",
  "Volunteering to spot a squat nobody was performing",
  "Distributing seventeen shirtless gym photos under the fraudulent label “form check”",
  "Maintaining eye contact during a compliment long enough to establish common-law marriage",
  "Calling another user “daddy” often enough to trigger a paternity hearing",
  "Turning a wrestling demonstration into evidence requiring age verification",
  "Describing prolonged thigh contact as “standard team-building procedure”",
  "Kissing the homies goodnight with detectable emotional follow-through",
  "First-degree bro-on-bro glazing with malice aforethought",
  "Operating a boys-only hot tub with lighting investigators deemed romantically actionable",
  "Possession of a playlist titled “For the Bros” containing forty-seven slow jams",
  "Asking who would top, then claiming the question concerned bunk beds",
  "Introducing massage oil into a wrestling demonstration without a permit",
  "Reacting to a shirtless selfie faster than the emergency services",
  "Winning gay chicken by refusing to acknowledge that the game ended forty minutes ago",
  "Fraudulently declaring the scene “gay as hell” while serving as its primary architect",
]);

const BROSEXUAL_SENTENCES = Object.freeze([
  "Ordered to explain “no homo” under oath while the evidence plays on a loop",
  "Forty hours of community service in the Bureau of Unresolved Tension, couples division",
  "Gym-mirror privileges suspended pending a full horny audit",
  "Fitted with an ankle monitor that activates whenever “pause” is filed too late",
  "Required to submit Form 69-B before complimenting another man's physique",
  "Court-appointed chaperone assigned to all future sleepovers and oil-wrestling demonstrations",
  "Group chat renamed from THE BOYS to DOMESTIC PARTNERSHIP pending appeal",
  "Sentenced to one candlelit interrogation with the alleged “just a friend”",
  "Prohibited from saying “bro” within ten feet of a hot tub, locker room, or bottle of massage oil",
  "Ordered to either commit to the bit or stop generating admissible evidence",
  "Phone placed on probation; heart-eye reactions now require two-factor authentication",
  "Mandatory six-foot separation during wrestling unless relationship paperwork is filed",
  "Ordered to answer “what are we?” once, honestly, and without consulting counsel",
  "Sentenced to hold the homies' hands until morale—and the alibi—improves",
  "Every future request to “pause” will be replaced with “continue, I'm listening”",
  "Sentenced to ninety days as the government's least convincing heterosexual informant",
  "Confiscation of all mood lighting, massage oil, and playlists labeled “gym motivation”",
  "Required to notify the neighbors before hosting another shirts-off team-building exercise",
  "Assigned a public defender who keeps asking why the evidence has background music",
  "Parole denied until the defendant completes one locker-room conversation without creating a sequel",
]);

const HORNYPOSTING_CHARGES = Object.freeze([
  "Operating a libido in public without federal supervision",
  "Felony thirst-posting in a channel not zoned for moisture",
  "Turning a routine conversation into the opening scene of a low-budget porno",
  "Saying “hear me out” before presenting an organism the Bureau has not classified as sexually actionable",
  "Requesting an alien probe with detectable enthusiasm",
  "Describing extraterrestrial anatomy with knowledge investigators consider suspiciously firsthand",
  "Deploying the tongue emoji with malice, forethought, and no viable alibi",
  "Calling a cryptid “breedable” during an active missing-person investigation",
  "Converting an evidence thread into an unsolicited mating display",
  "Failure to maintain zipper discipline during a classified briefing",
  "Posting “would” beneath an entity composed primarily of teeth and bad intentions",
  "Treating the typing indicator as foreplay",
  "Maintaining thirty-seven reaction images deemed inadmissible by Human Resources",
  "Attempting to seduce a profile picture at prohibited zoom levels",
  "Turning “first contact” into a proposal that required the legal department",
  "Searching for the NSFW version before confirming that a normal version existed",
  "Using “for research” as a fraudulent shield for industrial-grade perversion",
  "Sexualizing an abstract concept until the concept requested reassignment",
  "Entering incognito mode with premeditated lotion-adjacent intent",
  "Continuing to flirt after the horny detector caught fire and evacuated the building",
]);

const HORNYPOSTING_SENTENCES = Object.freeze([
  "Immediate transport to Horny Jail, Blacksite Annex, with no Wi-Fi and reinforced walls",
  "Mandatory cold shower administered by the National Weather Service at flash-flood intensity",
  "All tongue-emoji privileges suspended pending a full saliva audit",
  "Browser history sealed as hazardous evidence and launched directly into the Sun",
  "Keyboard replaced with a church organ that plays one judgmental chord whenever the subject types “would”",
  "Required to submit Form HR-69 thirty days before the next “hear me out”",
  "Libido fitted with a Bureau ankle monitor that announces BONK at courtroom volume",
  "Incognito mode placed under federal receivership until the search bar stops trembling",
  "Assigned a chaperone Grey with six eyes and absolutely no patience for this shit",
  "Every future thirst post automatically forwarded to the subject's grandmother for evidentiary review",
  "Profile picture rendered in government grayscale until vital signs return to non-embarrassing levels",
  "Sentenced to flirt exclusively with CAPTCHA until able to identify all traffic lights",
  "Thirst confiscated, vacuum-sealed, and stored in Area 51 beside the Ark and several cursed body pillows",
  "Required to explain the browser tabs aloud while a federal stenographer repeatedly asks “Why?”",
  "Placed on a strict thumbs-up-only emoji diet for ninety days",
  "All DMs routed through Human Resources, Legal, and one deeply disappointed priest",
  "Ordered to complete one conversation without making an inanimate object uncomfortable",
  "Issued the Bureau's industrial BONK hammer and instructed to apply it as needed",
  "Parole denied until the subject survives twenty-four hours without saying “smash,” “would,” or “breedable”",
  "Sentenced to supervised celibacy on a moon where even the rocks have blocked the subject",
]);

const HORNYPOSTING_FINDINGS = Object.freeze([
  "Field scans show 94 percent of available blood flow abandoned the decision-making organs.",
  "No extraterrestrial influence detected. This perversion appears locally sourced.",
  "The subject observed one exposed ankle and initiated a full mating protocol.",
  "Evidence technicians requested gloves for reasons unrelated to fingerprints.",
  "The subject claimed “research”; the browser history immediately invoked the Fifth.",
  "Thirst levels exceeded the server's cooling capacity and warped nearby message embeds.",
  "Every witness heard “hear me out.” None consented to the remainder.",
  "Zipper discipline was tested and returned NOT FOUND.",
  "The horny detector exceeded its design limit, caught fire, and filed for workers' compensation.",
  "Bureau analysts asked why. The subject answered, and morale has not recovered.",
]);

const GROSS_INCOMPETENCE_CHARGES = Object.freeze([
  "Operating a mouth without first loading a thought",
  "Reckless discharge of an unregistered opinion in a populated channel",
  "Transporting a bad take across state and dimensional lines with intent to distribute",
  "Willfully confusing confidence with evidence during a Bureau inquiry",
  "Attempting critical thought with the safety engaged and the magazine empty",
  "Failure to yield to the point despite lights, sirens, and a labeled diagram",
  "Possession of a conclusion with no visible means of reasoning",
  "Criminal disposal of context at an active conversation scene",
  "Impersonating a competent adult before a federal extraterrestrial officer",
  "Operating below the federally mandated minimum brain-cell occupancy",
]);

const GROSS_INCOMPETENCE_SENTENCES = Object.freeze([
  "Mandatory enrollment in Area 51's remedial object-permanence program",
  "One neuralyzer flash followed by a clean installation of factory-default common sense",
  "All future opinions must be submitted in crayon and countersigned by a mammal",
  "Brain placed in Airplane Mode until Bureau technicians locate compatible firmware",
  "Two hundred hours sorting evidence into OBVIOUS and SOMEHOW STILL MISSED IT",
  "Temporary reassignment as the blinking light on a machine nobody uses",
  "A supervised hearing before three Greys who already read the transcript and look exhausted",
  "Fitted with Bureau-issued training wheels for the next independent thought",
  "Confined to the Area 51 gift shop until able to outwit the motion-activated door",
  "Immediate transfer to the Department of Very Simple Shapes, remedial circle division",
]);

const GROSS_INCOMPETENCE_FINDINGS = Object.freeze([
  "Field scan detected a full-strength opinion and no corresponding idea.",
  "The clue was recovered unharmed; the subject never came near it.",
  "Thermal imaging confirmed the take was hot, but the brain was not.",
  "A second opinion was requested; investigators are still waiting for the first.",
  "Witnesses report the point passed directly overhead at low altitude.",
  "Bureau technicians rebooted the argument; the stupidity persisted.",
  "One loose fact was found at the scene, apparently abandoned.",
  "Confidence tested at 98 percent; comprehension returned trace amounts.",
  "The logic trail ended abruptly at a meme.",
  "No extraterrestrial influence detected. This appears indigenous.",
]);

const AGGRAVATED_COWARDICE_CHARGES = Object.freeze([
  "Talking Category-Five shit and evacuating at the first measurable consequence",
  "Abandoning a government-issued backbone at the scene of a verbal engagement",
  "Operating a mouth at combat volume while courage remained in Silent Mode",
  "Filing an emergency tactical retreat after encountering mild disagreement",
  "Counterfeiting bravado with intent to flee",
  "Pussying out in the first degree after preauthorizing a victory speech",
  "Seeking shelter behind “I was joking” during an active accountability event",
  "Declining a Thunderdome challenge after conducting extensive pre-fight barking",
  "Surrendering before hostile action commenced, including before reading the whole message",
  "Possessing industrial-grade trash talk without the spine required to operate it",
]);

const AGGRAVATED_COWARDICE_SENTENCES = Object.freeze([
  "Ordered to retrieve their backbone from Blacksite Lost & Found; claim ticket not provided",
  "Thirty days shadowboxing a push notification under the disappointed supervision of a Grey intern",
  "All future trash talk must be notarized, insured, and co-signed by somebody brave",
  "Reassigned to Witness Protection under the alias Anonymous Source",
  "Confined to the shallow end of the Blacksite Arena with Bureau-issued floaties",
  "Courage recalibration by a four-foot Grey who has somehow demonstrated more backbone",
  "Downgraded from field operative to the person who holds the elevator and still flinches",
  "Required to announce “This opinion is consequence-free” before running their mouth",
  "Issued an emotional-support neuralyzer and a whistle for summoning an adult",
  "Assigned to the M.I.B. Tactical Fainting Unit, where every mission is canceled due to vibes",
]);

const AGGRAVATED_COWARDICE_FINDINGS = Object.freeze([
  "Security footage shows the bravado entering first and the subject leaving separately.",
  "Agents documented a suspiciously spine-shaped vacancy at the scene.",
  "The fight-or-flight response skipped directly to logging off.",
  "The subject's courage transponder last pinged three counties away.",
  "Bark registered at 112 decibels; bite returned Error 404.",
  "Witnesses observed a “don't make me” posture, followed by the subject making themselves leave.",
  "Tactical scans detected four exits and zero principles.",
  "The subject took shelter behind a joke with the serial numbers filed off.",
  "The Arena challenge made eye contact; the subject did not.",
  "No hostile action was required; the subject folded during the briefing.",
]);

const WEAPONIZED_PEDANTRY_CHARGES = Object.freeze([
  "Aggravated distinction without a difference requiring Bureau-grade quantum optics",
  "First-degree “actually” deployment into a functioning conversation",
  "Felony context evasion by selecting the one interpretation no reasonable mammal would use",
  "Premeditated semantic entrapment through a definition nobody else agreed to",
  "Possession of excessive footnotes with intent to annoy",
  "Unlicensed devil's advocacy in a room that did not need a worse person",
  "Laundering a personal preference as an objective rule with counterfeit authority",
  "Obstruction of an intelligible point by an irrelevant technicality",
  "Attempted victory by typographical error",
  "Reckless deployment of Latin where the word “no” would have worked",
]);

const WEAPONIZED_PEDANTRY_SENTENCES = Object.freeze([
  "Draft a complete errata sheet for their own personality, including all unsupported claims",
  "Eighty hours of Corrective Listening with “technically” prohibited until the speaker finishes",
  "Issued a Bureau dictionary in which every definition reads YOU KNEW WHAT THEY MEANT",
  "Ordered to debate a government photocopier until either party produces an interesting point",
  "All future footnotes audited by Agent K for relevance, necessity, and signs of a social life",
  "Remanded to Semantic Containment, where every definition is context-dependent and nobody lets them finish",
  "“Actually” privileges suspended; approved replacement phrase: “This adds nothing, but…”",
  "Proofread the extraterrestrial tax code aloud while an auditor asks whether the distinction is material",
  "Explain intelligence versus pedantry to an empty room that interrupts every thirty seconds with “Source?”",
  "Wear a Bureau lanyard reading TECHNICALLY CORRECT — OPERATIONALLY USELESS until morale improves",
]);

const WEAPONIZED_PEDANTRY_FINDINGS = Object.freeze([
  "Bureau optics located the original point beneath fourteen layers of clarification.",
  "Every witness understood the statement; the subject activated anyway.",
  "The correction tested technically accurate and socially fatal.",
  "Six citations were recovered, none relevant to why anyone was speaking.",
  "The goalpost moved exactly 3.7 millimeters and the subject declared a new jurisdiction.",
  "One joke was pronounced dead after prolonged exposure to explanation.",
  "Latin residue was found at the scene; practical value was zero.",
  "No material difference was detected between the two distinctions.",
  "A misplaced apostrophe was processed as a signed confession.",
  "The conversation resumed only after the subject briefly inhaled.",
]);

const MEME_MALPRACTICE_CHARGES = Object.freeze([
  "Possession with intent to repost a meme bearing three watermarks and no surviving humor",
  "Aggravated caption-image mismatch with no apparent chemistry or diplomatic ties",
  "First-degree reaction-image abuse across four unrelated emergencies",
  "Unlicensed deep-frying until the original joke died during processing",
  "Premeditated removal of the only funny part before distribution",
  "Cross-platform laundering of a stale Facebook artifact through X, Reddit, and Discord",
  "Dissemination of a format that died in 2017 without an embalming permit",
  "Reckless use of Impact Font with depraved indifference to comedic standards",
  "Failure to establish comedic probable cause",
  "Creation of a memetic mass-casualty event followed by coordinated channel silence",
]);

const MEME_MALPRACTICE_SENTENCES = Object.freeze([
  "Meme license downgraded to text-only reactions pending evidence of rehabilitation",
  "Explain the meme aloud until the subject personally understands why nobody laughed",
  "Eighty hours tagging every evidence file named funny_final_FINAL2.jpg",
  "All future memes require preclearance from three federal agents and one civilian with functioning taste",
  "Device replaced with a beige government fax machine capable only of transmitting disappointment",
  "Remanded to a 2011 Facebook page where Minion graphics are considered breaking news",
  "Neuralyzation until the subject forgets both the punchline and the decision to post it",
  "Submit a written apology to JPEG compression for dragging it into this",
  "Confined to government-issued clip art until Bureau analysts detect an original thought",
  "Guard the stale-meme evidence locker and prevent this format from escaping again",
]);

const MEME_MALPRACTICE_FINDINGS = Object.freeze([
  "Carbon dating places the format somewhere between planking and the Harlem Shake.",
  "Humor was not recovered at the scene.",
  "Three visible watermarks indicate a long history of interstate trafficking.",
  "Image compression had already entered the Witness Protection Program.",
  "Reverse-image search traced the exhibit to a Facebook group for recently divorced dads.",
  "The punchline was removed before upload and remains missing.",
  "Channel silence lasted eleven seconds before someone changed the subject in self-defense.",
  "Evidence count: fourteen pixels, three watermarks, zero laughs.",
  "AI forensics detected seven fingers and no human involvement in the writing.",
  "The same reaction image has been implicated in eight prior incidents.",
]);

export const OFFENSES = Object.freeze({
  low_altitude: Object.freeze({
    id: "low_altitude",
    menuLabel: "Low-Altitude Hostility",
    menuDescription: "Height jokes and compact-command insubordination.",
    menuEmoji: "🛸",
    heading: "LOW-ALTITUDE HOSTILITY DETECTED",
    color: 0x7ddc63,
    charges: LOW_ALTITUDE_CHARGES,
    sentences: LOW_ALTITUDE_SENTENCES,
    footer: "The moderator's stature remains classified under intergalactic law.",
  }),
  berberphobia: Object.freeze({
    id: "berberphobia",
    menuLabel: "Aggravated Berberphobic Conduct",
    menuDescription: "Anti-Amazigh hostility and culturally hostile dumbassery.",
    menuEmoji: "⚖️",
    heading: "AGGRAVATED BERBERPHOBIC CONDUCT DETECTED",
    color: 0xd94f4f,
    charges: BERBERPHOBIA_CHARGES,
    sentences: BERBERPHOBIA_SENTENCES,
    footer:
      "Aliens Anonymous Bureau of Cultural Justice — prejudice is not protected by clearance.",
  }),
  minority_violation: Object.freeze({
    id: "minority_violation",
    menuLabel: "Aggravated Minority Violation",
    menuDescription:
      "Civil-rights panic, demographic meltdowns, and counterfeit supremacy.",
    menuEmoji: "🚫",
    heading: "AGGRAVATED MINORITY VIOLATION DETECTED",
    color: 0xef4444,
    charges: MINORITY_VIOLATION_CHARGES,
    sentences: MINORITY_VIOLATION_SENTENCES,
    findings: MINORITY_VIOLATION_FINDINGS,
    footer:
      "Bureau ruling: being a minority is legal. Acting like a tiny authoritarian asshole about it is not.",
  }),
  brosexual: Object.freeze({
    id: "brosexual",
    menuLabel: "Aggravated Brosexual Conduct",
    menuDescription: "Felony-grade sus behavior and catastrophically failed denials.",
    menuEmoji: "🤨",
    heading: "AGGRAVATED BROSEXUAL CONDUCT DETECTED",
    color: 0xd946ef,
    charges: BROSEXUAL_CHARGES,
    sentences: BROSEXUAL_SENTENCES,
    footer:
      "The Bureau determines conduct, not orientation. Your alibi, however, is absolute dogshit.",
  }),
  hornyposting: Object.freeze({
    id: "hornyposting",
    menuLabel: "Aggravated Hornyposting",
    menuDescription:
      "Unlicensed thirst, pervert behavior, and catastrophic zipper discipline.",
    menuEmoji: "🥵",
    heading: "UNAUTHORIZED HORNY ACTIVITY DETECTED",
    color: 0xfb7185,
    charges: HORNYPOSTING_CHARGES,
    sentences: HORNYPOSTING_SENTENCES,
    findings: HORNYPOSTING_FINDINGS,
    footer:
      "The Bureau respects healthy sexuality. It does not respect whatever the fuck this was.",
  }),
  gross_incompetence: Object.freeze({
    id: "gross_incompetence",
    menuLabel: "Gross Cognitive Negligence",
    menuDescription: "Felony stupidity and thought-like activity without a permit.",
    menuEmoji: "🧠",
    heading: "CRIMINALLY NEGLIGENT COGNITION DETECTED",
    color: 0xf59e0b,
    charges: GROSS_INCOMPETENCE_CHARGES,
    sentences: GROSS_INCOMPETENCE_SENTENCES,
    findings: GROSS_INCOMPETENCE_FINDINGS,
    footer:
      "Bureau scanners found no intelligent life. The search has been downgraded to recovery.",
  }),
  aggravated_cowardice: Object.freeze({
    id: "aggravated_cowardice",
    menuLabel: "Aggravated Pussy Conduct",
    menuDescription: "Counterfeit bravado, tactical retreat, and catastrophic spine failure.",
    menuEmoji: "🐔",
    heading: "AGGRAVATED PUSSY CONDUCT DETECTED",
    color: 0xeab308,
    charges: AGGRAVATED_COWARDICE_CHARGES,
    sentences: AGGRAVATED_COWARDICE_SENTENCES,
    findings: AGGRAVATED_COWARDICE_FINDINGS,
    footer:
      "The Bureau assesses conduct, not anatomy. The conduct was still cowardly as fuck.",
  }),
  weaponized_pedantry: Object.freeze({
    id: "weaponized_pedantry",
    menuLabel: "Weaponized Pedantry",
    menuDescription: "Technically correct trivia deployed to obstruct the obvious point.",
    menuEmoji: "🤓",
    heading: "WEAPONIZED PEDANTRY DETECTED",
    color: 0x3b82f6,
    charges: WEAPONIZED_PEDANTRY_CHARGES,
    sentences: WEAPONIZED_PEDANTRY_SENTENCES,
    findings: WEAPONIZED_PEDANTRY_FINDINGS,
    footer:
      "Technical correctness is not a defense when the defendant remains operationally useless.",
  }),
  meme_malpractice: Object.freeze({
    id: "meme_malpractice",
    menuLabel: "Aggravated Meme Malpractice",
    menuDescription: "Criminal deployment of stale, mangled, or catastrophically bad memes.",
    menuEmoji: "🗿",
    heading: "FELONIOUS MEME MISUSE DETECTED",
    color: 0x8b5cf6,
    charges: MEME_MALPRACTICE_CHARGES,
    sentences: MEME_MALPRACTICE_SENTENCES,
    findings: MEME_MALPRACTICE_FINDINGS,
    footer:
      "The meme has been bagged as evidence. Humor was not recovered at the scene.",
  }),
});

export function getOffenseOptions() {
  return Object.values(OFFENSES).map((offense) => ({
    label: offense.menuLabel,
    description: offense.menuDescription,
    emoji: offense.menuEmoji,
    value: offense.id,
  }));
}

export function pickOffense(offenseId, randomIndex = randomInt) {
  const offense = OFFENSES[offenseId];
  if (!offense) {
    throw new Error(`Unknown offense: ${offenseId}`);
  }

  const charge = offense.charges[randomIndex(offense.charges.length)];
  const sentence = offense.sentences[randomIndex(offense.sentences.length)];
  const finding = offense.findings
    ? offense.findings[randomIndex(offense.findings.length)]
    : null;

  return {
    offense,
    charge,
    sentence,
    finding,
  };
}
