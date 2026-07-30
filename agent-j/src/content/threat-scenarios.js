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

export const THREAT_SCENARIOS = deepFreeze([
  {
    tier: 0,
    scenarios: [
      {
        id: "threat-t0-hold-music-hostage",
        tier: 0,
        premise:
          "The subject survives conflict by trapping every opponent in an endless customer-service queue.",
        survivalRange: { min: 96, max: 99 },
        intros: [
          "I found a threat, chief, but it is waiting for the next available representative.",
          "I checked the combat file and found somebody had put the whole operation on hold.",
        ],
        classification: [
          "Queue-Bound Customer-Service Noncombatant",
          "Hold-Music-Dependent Administrative Nuisance",
          "Toll-Free Menace With No Live Representative",
        ],
        capability: [
          "Can transfer a confrontation to the wrong extension in under four minutes.",
          "Sustains a combat posture for exactly one loop of hold music.",
          "Can make a trained agent forget why the call began.",
        ],
        attack: [
          "Opens with hold music loud enough to erase the attacker's original question.",
          "Routes the opponent through three extensions and one legally dead department.",
          "Deploys a recorded assurance that a representative will arrive sometime after lunch.",
        ],
        defense: [
          "Places incoming damage on hold and never returns to the line.",
          "Transfers the threat to an extension that has not existed since 2009.",
          "Hides behind a prerecorded call menu with no option for violence.",
        ],
        weakness: [
          "A live representative causes immediate loss of queue authority.",
          "Pressing zero repeatedly collapses the subject's hold-based defense.",
          "Silence between music loops forces the subject to confront the actual call.",
        ],
        casualty: [
          "The only likely casualty is one caller's remaining lunch break.",
          "Collateral damage is limited to a headset and thirty minutes of queue patience.",
          "One innocent office phone may be abandoned mid-call.",
        ],
        containment: [
          "Keep the subject on hold until it forgets which agency it threatened.",
          "Route the subject to billing and seal every available extension.",
          "Containment requires one working callback number and a representative with boundaries.",
        ],
      },
      {
        id: "threat-t0-vending-machine-negotiator",
        tier: 0,
        premise:
          "The subject can sustain aggression only while a vending machine continues dispensing snacks.",
        survivalRange: { min: 89, max: 97 },
        intros: [
          "I brought confidence, backup, and no quarters; this snack-powered standoff is already over.",
          "I inspected the battlefield and found one angry customer losing an argument with a candy spiral.",
        ],
        classification: [
          "Snack-Operated Lobby Predator",
          "Vending-Dependent Caloric Belligerent",
          "Quarter-Fed Break-Room Disturbance",
        ],
        capability: [
          "Can maintain hostilities until the final bag of chips clears the vending spiral.",
          "Converts powdered cheese into six seconds of snack-assisted courage.",
          "Reaches peak combat readiness whenever a candy bar falls without being shaken loose.",
        ],
        attack: [
          "Launches stale chips from the vending tray with disappointing accuracy.",
          "Fires quarters hard enough to inconvenience an unprotected shin.",
          "Yells “I paid for that” at full volume while shoulder-checking the vending machine toward the opponent.",
        ],
        defense: [
          "Takes cover behind the vending machine and claims the snacks as hostages.",
          "Distracts incoming fire by releasing a sacrificial candy bar.",
          "Builds temporary armor from empty chip bags and misplaced confidence.",
        ],
        weakness: [
          "An illuminated OUT OF ORDER sign drains all snack-based aggression.",
          "A jammed vending spiral reduces the subject to customer-service bargaining.",
          "Card-reader failure leaves the subject powerless and searching for quarters.",
        ],
        casualty: [
          "Likely losses include two snacks and the dignity of whoever shakes the machine.",
          "One break-room trash can may perish beneath a landslide of chip bags.",
          "Collateral damage should remain limited to vending inventory and nearby appetite.",
        ],
        containment: [
          "Unplug the vending machine and offer the subject a granola bar through the door.",
          "Seal the snack tray, remove all quarters, and wait for the sugar crash.",
          "Contain the subject beside a machine stocked exclusively with unsalted crackers.",
        ],
      },
    ],
  },
  {
    tier: 1,
    scenarios: [
      {
        id: "threat-t1-folding-chair-apprentice",
        tier: 1,
        premise:
          "The subject treats a folding chair as advanced weaponry but cannot operate it without the printed instructions.",
        survivalRange: { min: 70, max: 85 },
        intros: [
          "I can handle this; our suspect is still searching the chair for an ON switch.",
          "I see the problem: too much confidence, one folding chair, and absolutely no assembly clearance.",
        ],
        classification: [
          "Diagram-Assisted Folding-Chair Combatant",
          "Hinge-Class Furniture Apprentice",
          "Manufacturer-Warned Seating Militant",
        ],
        capability: [
          "Can swing a folding chair once the safety diagram is facing the correct direction.",
          "Operates one chair hinge at a time under close instructional supervision.",
          "Achieves moderate furniture velocity after rereading the manufacturer's warning.",
        ],
        attack: [
          "Attempts a folding-chair strike while the legs remain locked around one ankle.",
          "Charges behind an unfolded chair and calls the seating arrangement tactical.",
          "Uses the instruction sheet as a targeting reticle for a badly aimed chair toss.",
        ],
        defense: [
          "Hides behind the folding chair but leaves every important hinge exposed.",
          "Forms a defensive seating position prohibited by the manufacturer.",
          "Snaps the chair closed around the incoming weapon and traps both until somebody finds the release latch.",
        ],
        weakness: [
          "Removing the instruction sheet disables all chair-based combat functions.",
          "A jammed hinge reduces the entire chair doctrine to panicked wrestling.",
          "The words 'some assembly required' trigger complete hinge paralysis.",
        ],
        casualty: [
          "Expected casualties include one chair, two fingers, and the manufacturer's patience.",
          "The nearest folding table may be injured while attempting to mediate.",
          "Collateral damage is confined to seating and one badly pinched hand.",
        ],
        containment: [
          "Confiscate the chair instructions and replace them with a restaurant booster seat.",
          "Lock every hinge open before transporting the subject through the furniture aisle.",
          "Contain the subject in a room where all chairs are permanently bolted down.",
        ],
      },
      {
        id: "threat-t1-bluetooth-blockade",
        tier: 1,
        premise:
          "The subject projects confidence through a portable speaker and loses all authority when Bluetooth disconnects.",
        survivalRange: { min: 75, max: 92 },
        intros: [
          "I know entrance music, and that is a Bluetooth cry for help with the bass turned up.",
          "I heard the threat before I saw it, which usually means weak battery and a terrible playlist.",
        ],
        classification: [
          "Portable-Speaker Blockade Specialist",
          "Bluetooth-Paired Volume Insurgent",
          "Low-Battery Bass-Line Agitator",
        ],
        capability: [
          "Can occupy a public space as long as the speaker remains paired.",
          "Generates enough bass to rattle one loose window and several firm opinions.",
          "Maintains tactical confidence at any speaker volume above a responsible level.",
        ],
        attack: [
          "Broadcasts the same playlist until the opponent considers voluntary exile.",
          "Drops a bass line calibrated to dislodge unsecured drink lids.",
          "Loops the Bluetooth pairing tone until the opponent starts checking their own skull for connected devices.",
        ],
        defense: [
          "Raises the speaker volume whenever a fact approaches.",
          "Hides behind a wall of bass and an aggressively flashing battery light.",
          "Pairs with every nearby speaker to create a low-budget audio decoy.",
        ],
        weakness: [
          "A Bluetooth disconnect removes ninety percent of the subject's battlefield presence.",
          "The low-battery warning interrupts all speaker-based intimidation.",
          "A competing playlist causes immediate loss of volume authority.",
        ],
        casualty: [
          "The first casualty will be one conversation beneath the speaker's bass line.",
          "Collateral bass damage includes three drink lids and a neighbor's remaining patience.",
          "One portable speaker may die bravely at twelve percent battery.",
        ],
        containment: [
          "Unpair the speaker and transport the subject in a vehicle with no auxiliary input.",
          "Disconnect Bluetooth and trap the controls beneath Accounting's lunch playlist.",
          "Contain the subject and speaker inside a soundproof room with a dead outlet and no charger.",
        ],
      },
    ],
  },
  {
    tier: 2,
    scenarios: [
      {
        id: "threat-t2-embarrassment-reactor",
        tier: 2,
        premise:
          "The subject converts personal embarrassment into short-range kinetic bursts whenever witnesses notice.",
        survivalRange: { min: 52, max: 75 },
        intros: [
          "I respect the efficiency: one bad story, two witnesses, and enough embarrassment to power a small breach.",
          "I advise taking cover before the subject remembers something awkward from middle school.",
        ],
        classification: [
          "Witness-Activated Embarrassment Reactor",
          "Secondhand-Shame Kinetic Hazard",
          "Cringe-Fueled Close-Quarters Menace",
        ],
        capability: [
          "Converts a witnessed embarrassment into a kinetic pulse strong enough to open drywall.",
          "Stores awkward memories as unstable short-range shame energy.",
          "Can power three consecutive cringe bursts before inventing a new alibi.",
        ],
        attack: [
          "Recalls an embarrassing story and releases the shame as a concussive wave.",
          "Projects concentrated secondhand cringe at everyone who made eye contact.",
          "Detonates an awkward silence before witnesses can leave the blast radius.",
        ],
        defense: [
          "Redirects incoming force by blaming the nearest witness for the embarrassment.",
          "Wraps the body in hardened shame and pretends the awkward event was intentional.",
          "Absorbs damage into a cringe memory that nobody else was prepared to hear.",
        ],
        weakness: [
          "A sincere reassurance safely grounds the subject's embarrassment charge.",
          "Removing all witnesses leaves the shame reactor without ignition.",
          "Owning the awkward mistake causes a complete loss of kinetic pressure.",
        ],
        casualty: [
          "Likely casualties include one witness and the room's ability to make eye contact.",
          "Collateral damage begins with drywall and ends with a group-wide cringe response.",
          "The first victim will be whoever asks why the subject looks embarrassed.",
        ],
        containment: [
          "Clear all witnesses and let the embarrassment discharge into an empty room.",
          "Contain the subject with sincere reassurance and a written ban on awkward anecdotes.",
          "Assign one agent to normalize the cringe event until kinetic readings reach zero.",
        ],
      },
      {
        id: "threat-t2-counterfeit-badge-marshal",
        tier: 2,
        premise:
          "The subject gains tactical authority from a counterfeit badge until anyone verifies the printed clearance.",
        survivalRange: { min: 45, max: 68 },
        intros: [
          "I have cereal-box prizes with stronger jurisdiction than that cute badge.",
          "I almost respect the confidence it takes to bring a laminated credential to a clearance fight.",
        ],
        classification: [
          "Counterfeit-Clearance Field Marshal",
          "Laminated-Badge Jurisdiction Pirate",
          "Unauthorized Credential Enforcement Officer",
        ],
        capability: [
          "Can command a room until someone verifies the badge's counterfeit clearance number.",
          "Projects temporary authority through a lanyard stolen from a regional sales conference.",
          "Issues convincing tactical orders while the credential remains unexamined.",
        ],
        attack: [
          "Serves an imaginary citation while advancing behind the counterfeit badge.",
          "Declares emergency jurisdiction and points the lanyard like a warrant.",
          "Launches a clearance inspection designed to make the opponent question their own credentials.",
        ],
        defense: [
          "Raises the badge and claims incoming fire lacks proper jurisdiction.",
          "Hides behind a fictional clearance level printed in unnecessarily bold type.",
          "Files an imaginary citation against every attack that reaches the lanyard.",
        ],
        weakness: [
          "A routine credential scan exposes the badge as laminated office debris.",
          "Asking which agency issued the clearance collapses the subject's authority.",
          "Removing the lanyard reduces the field marshal to an unsupervised civilian.",
        ],
        casualty: [
          "The likely casualty is one guard who trusted the badge without checking.",
          "Collateral damage includes three void citations and the lobby's faith in authority.",
          "One legitimate credential may be confiscated during the counterfeit inspection.",
        ],
        containment: [
          "Scan the badge, revoke the imaginary jurisdiction, and bag the lanyard as evidence.",
          "Contain the subject behind a checkpoint staffed by someone who verifies credentials.",
          "Replace the counterfeit clearance with a visitor sticker that expires before lunch.",
        ],
      },
    ],
  },
  {
    tier: 3,
    scenarios: [
      {
        id: "threat-t3-vape-biome",
        tier: 3,
        premise:
          "The subject's neglected vape cartridge produces an aggressive aerosol ecosystem that follows verbal commands.",
        survivalRange: { min: 38, max: 62 },
        intros: [
          "I would not breathe that swagger in, rookie; the vape cloud just developed local government.",
          "I found the missing ecosystem, and apparently it has been living inside one burnt coil.",
        ],
        classification: [
          "Command-Guided Vape Biome",
          "Burnt-Coil Aerosol Warlord",
          "Cartridge-Bred Atmospheric Predator",
        ],
        capability: [
          "Commands a vape-cloud ecosystem containing several organisms with tactical ambitions.",
          "Can grow replacement aerosol drones from residue trapped around the burnt coil.",
          "Maintains a hostile fog bank as long as flavor remains in the cartridge.",
        ],
        attack: [
          "Releases a vape cloud that hunts warm electronics and unguarded ventilation.",
          "Floods the opponent's lungs with aerosol engineered to taste like artificial melon.",
          "Launches burnt-coil spores that organize into a very small strike formation.",
        ],
        defense: [
          "Disappears inside a vape fog whose organisms report every approaching footstep.",
          "The vape cloud swallows incoming debris and spits it back sharpened.",
          "Surrounds the cartridge with a living cloud that bites anything carrying fresh air.",
        ],
        weakness: [
          "A working air purifier breaks the vape biome's command structure.",
          "Removing the cartridge starves every aerosol organism at once.",
          "Fresh outdoor air forces the hostile cloud into immediate ecological collapse.",
        ],
        casualty: [
          "Likely casualties include one vape-clogged ventilation system and every unscented surface nearby.",
          "The first loss will be an air-quality sensor swallowed by the vape biome.",
          "Collateral damage extends to three filters and a room permanently flavored like melon.",
        ],
        containment: [
          "Seal the cartridge in clean air and process the remaining vape cloud through industrial filters.",
          "Contain the aerosol biome inside a ventilation hood with no flavor supply.",
          "Deploy purifiers in formation and quarantine the burnt coil as an invasive habitat.",
        ],
      },
      {
        id: "threat-t3-furniture-poltergeist",
        tier: 3,
        premise:
          "The subject's unresolved decorating rage animates nearby furniture into a coordinated assault team.",
        survivalRange: { min: 30, max: 55 },
        intros: [
          "I have handled alien invasions with less attitude than that recliner, so everybody watch the upholstery.",
          "I confirm the couch is hostile, the ottoman is flanking, and the decorating plan has failed.",
        ],
        classification: [
          "Upholstery-Command Poltergeist",
          "Hostile Furniture Arrangement Specialist",
          "Decorating-Rage Interior Siege Engine",
        ],
        capability: [
          "Can animate a complete living-room set through concentrated decorating rage.",
          "Coordinates sofas and end tables with the precision of a deeply offended floor plan.",
          "Maintains telekinetic control over any furniture that clashes with the intended decor.",
        ],
        attack: [
          "Launches the ottoman first while the couch blocks every practical exit.",
          "Sends two end tables skidding in from opposite sides to pin the target at the ankles.",
          "Drives a hostile recliner forward under cover from airborne cushions.",
        ],
        defense: [
          "Builds an upholstery barricade from furniture that refuses to match.",
          "Rotates the couch into incoming fire and calls the new layout intentional.",
          "Hides behind a recliner whose footrest intercepts anything at knee height.",
        ],
        weakness: [
          "A professionally approved floor plan quiets the subject's decorating rage.",
          "Removing all loose furniture leaves the poltergeist with nothing to arrange.",
          "One sincere compliment about the couch disrupts the entire upholstery assault.",
        ],
        casualty: [
          "Likely casualties include one coffee table and whoever mocked the couch.",
          "Collateral damage will spread from the living room to every unsecured end table.",
          "The first victim is expected to be a lamp caught between rival furniture formations.",
        ],
        containment: [
          "Move the subject into a completely unfurnished room before discussing the decor.",
          "Contain each hostile furniture piece separately before discussing the decor.",
          "Deploy a certified interior designer to negotiate with the couch.",
        ],
      },
    ],
  },
  {
    tier: 4,
    scenarios: [
      {
        id: "threat-t4-accountability-storm",
        tier: 4,
        premise:
          "Any request for accountability causes the subject to generate destructive weather while redirecting blame.",
        survivalRange: { min: 12, max: 42 },
        intros: [
          "I asked for one apology and the victim complex turned into a lightning storm.",
          "I brought an umbrella, a lightning rod, and exactly zero patience for weaponized blame.",
        ],
        classification: [
          "Accountability-Triggered Weather Emergency",
          "Blame-Redirecting Atmospheric Offender",
          "Consequence-Avoidant Storm System",
        ],
        capability: [
          "Generates a rotating storm front whenever responsibility enters the conversation.",
          "Can redirect blame fast enough to produce regional wind shear.",
          "A simple apology request becomes a victim-complex lightning storm in seconds.",
        ],
        attack: [
          "Throws a victim-complex lightning bolt at whoever asks for accountability.",
          "Drops fist-sized hail while blaming the nearest witness for the weather.",
          "Whips one avoided consequence into a tornado aimed at the person who mentioned it.",
        ],
        defense: [
          "Deflects incoming fire into a rotating wall of redirected blame.",
          "Hides inside an accountability storm where every consequence points outward.",
          "Uses a false apology to generate enough crosswind to bend the evidence.",
        ],
        weakness: [
          "A complete apology drains the accountability storm before it reaches rotation.",
          "Accepting one consequence collapses the subject's entire blame front.",
          "A calm witness repeating 'your responsibility' disrupts the weather pattern.",
        ],
        casualty: [
          "The first likely casualty is the witness blamed for weather they did not create.",
          "A power substation and three parked cars will absorb the subject's refused apology.",
          "The meeting room loses its roof when somebody tells the subject to take responsibility.",
        ],
        containment: [
          "Seat the subject before one verified consequence and wait out the storm.",
          "Require a direct apology; each accepted fact lowers the atmospheric pressure.",
          "Keep witnesses outside the blame radius until the subject accepts responsibility.",
        ],
      },
      {
        id: "threat-t4-paperwork-collapse",
        tier: 4,
        premise:
          "The subject manufactures self-replicating paperwork that turns every unsigned form into physical wreckage.",
        survivalRange: { min: 20, max: 45 },
        intros: [
          "I wanted one signature; this fool brought enough paperwork to collapse a federal annex.",
          "I have seen ugly files before, but these forms are reproducing without adult supervision.",
        ],
        classification: [
          "Self-Replicating Paperwork Catastrophe",
          "Unsigned-Form Structural Hazard",
          "Bureaucratic Filing Cascade",
        ],
        capability: [
          "Duplicates every unsigned form until the paperwork can support its own weather system.",
          "Can turn a missing signature into several tons of weaponized filing backlog.",
          "Produces fresh bureaucratic debris whenever a stamp lands in the wrong box.",
        ],
        attack: [
          "Launches sharpened forms from a filing cabinet that has exceeded legal density.",
          "Buries the target beneath duplicate paperwork demanding the same missing signature.",
          "Drops a pallet of rejected applications through the desk and leaves a form-shaped impact crater.",
        ],
        defense: [
          "Builds a paper barricade from forms no department admits creating.",
          "Redirects incoming force into a filing loop marked PENDING REVIEW.",
          "Hides behind a clipboard dense enough to stop both questions and small vehicles.",
        ],
        weakness: [
          "One correctly signed form halts the paperwork replication cycle.",
          "A valid retention policy dissolves the subject's bureaucratic armor.",
          "Placing the proper stamp in the proper box causes catastrophic filing compliance.",
        ],
        casualty: [
          "Likely casualties include one federal annex and everyone waiting for a signature.",
          "Collateral damage will bury the records department beneath six fiscal years of paperwork.",
          "The first loss is expected to be a desk crushed by its own filing backlog.",
        ],
        containment: [
          "Secure one valid signature on the source form, then shred every duplicate downstream.",
          "Contain the forms inside a records vault governed by an enforceable retention policy.",
          "Deploy a senior clerk with the correct stamp and authority to close the filing loop.",
        ],
      },
    ],
  },
  {
    tier: 5,
    scenarios: [
      {
        id: "threat-t5-notification-singularity",
        tier: 5,
        premise:
          "The subject's unread notifications accumulate gravitational mass until the group chat collapses into a singularity.",
        survivalRange: { min: 8, max: 25 },
        intros: [
          "I watched that unread count pull a communications satellite out of orbit; put the phone down.",
          "I muted the group chat, but the group chat has begun muting nearby planets.",
        ],
        classification: [
          "Unread-Notification Gravitational Singularity",
          "Group-Chat Collapse Event",
          "Planetary-Scale Read-Receipt Failure",
        ],
        capability: [
          "Adds measurable gravity to every unread notification on the subject's phone.",
          "Can pull nearby electronics into orbit around one neglected group chat.",
          "Sustains a notification singularity using nothing but unread pings and avoidance.",
        ],
        attack: [
          "Releases a notification burst that drags every nearby device toward the unread count.",
          "Weaponizes one group-chat ping into a gravitational wave with global reach.",
          "Opens the notification panel and lets twelve thousand unread alerts escape at once.",
        ],
        defense: [
          "Hides beyond the event horizon of an unanswered group chat.",
          "Bends incoming fire around a dense cluster of unread notifications.",
          "Buries the read receipts beneath enough unread pings to curve incoming fire around the phone.",
        ],
        weakness: [
          "A global MARK ALL AS READ command destabilizes the singularity before planetary capture.",
          "The phone's physical kill switch starves the group-chat gravity field.",
          "Reading the oldest ping aloud collapses the unread event horizon.",
        ],
        casualty: [
          "Likely casualties include global communications and the friend who sent the first ping.",
          "Collateral damage begins with nearby phones and ends with the group chat consuming its own server.",
          "The first loss will be every device still waiting for a read receipt.",
        ],
        containment: [
          "Broadcast the server-wide read-all command before the unread count captures another satellite.",
          "Trigger the hardware kill switch and seal the powered-down phone inside a Faraday case.",
          "Force one verified read receipt through the event horizon, then delete the group chat.",
        ],
      },
      {
        id: "threat-t5-complaint-continuum",
        tier: 5,
        premise:
          "The subject's customer complaint copies itself into neighboring timelines whenever a refund is denied.",
        survivalRange: { min: 2, max: 18 },
        intros: [
          "I watched the complaint ask for a manager, eat the manager, and request his supervisor.",
          "I found the refund ticket in six timelines; in five of them, customer service lost.",
        ],
        classification: [
          "Self-Replicating Complaint Continuum",
          "Refund-Denial Timeline Predator",
          "Multiversal Service-Desk Extinction Ticket",
        ],
        capability: [
          "Copies one unresolved complaint into every timeline where the refund remains denied.",
          "Promotes a service ticket through management until causality reports to it.",
          "Turns each rejected refund into another complaint with independent temporal authority.",
        ],
        attack: [
          "Files the complaint yesterday, tomorrow, and during the target's original training.",
          "Summons alternate managers from timelines where the refund policy already failed.",
          "Releases a swarm of service tickets that rewrite every receipt they touch.",
        ],
        defense: [
          "Escapes into a timeline where the complaint was assigned to a different manager.",
          "Uses contradictory refund policies as armor against a single coherent outcome.",
          "Reopens every closed service ticket until incoming force is lost in the queue.",
        ],
        weakness: [
          "A full refund from an empowered manager resolves the original complaint before it can branch again.",
          "One supervisor with final refund authority severs the service ticket from neighboring timelines.",
          "A valid refund receipt collapses the complaint continuum at its source.",
        ],
        casualty: [
          "Likely casualties include causality, six managers, and the original service desk.",
          "Collateral spreads through every timeline still promising a five-business-day refund.",
          "The first loss will be the universe where somebody marked the complaint RESOLVED.",
        ],
        containment: [
          "Send an empowered manager to issue full reimbursement at the complaint's earliest timestamp.",
          "Pair full repayment with a supervisor authorized to close every duplicate ticket.",
          "Resolve the source ticket with every dollar returned and one manager holding final authority.",
        ],
      },
    ],
  },
]);
