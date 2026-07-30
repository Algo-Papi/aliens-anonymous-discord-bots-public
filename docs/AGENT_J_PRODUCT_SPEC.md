# Agent J - M.I.B. Product and Implementation Specification

Status: **Reference design for the included implementation**

The approved role-gated live-web research extension is specified separately in
`AGENT_J_RESEARCH.md`. Where this older document says Agent J never requests
Message Content or analyzes message bodies, the research specification is the
authoritative, narrowly bounded exception: the intent is enabled only with the
research feature flag, context is user-initiated and allowlisted, Standard is
the maximum 25-message scope, and transcripts are never persisted.

This document describes the design decisions behind the included Agent J
implementation. Deployment-specific application IDs, role membership, channel
IDs, credentials, and host paths are intentionally omitted from the public
template.

## 1. Product summary

Agent J is the member-facing entertainment counterpart to Agent K:

- **Agent K - M.I.B.** remains the moderator/enforcement persona and owns
  citations and citation history.
- **Agent J - M.I.B.** is a separate Discord application for ordinary members
  with an approved participation role.
- Agent J produces randomized fictional scans, recovered memories, threat
  assessments, and Blacksite Arena battles.
- Agent J must never receive moderation permissions or access Agent K's
  citation database/token.

The experience should feel like a confident, fast-talking M.I.B. field agent:
swagger, playful disrespect, improvised-sounding roasts, government jargon,
science-fiction nonsense, and dark comedy. It should not sound like Agent K's
dry bureaucratic enforcement voice.

### Explicit MVP non-goals

- No citations, moderation actions, timeouts, role management, or access to
  Agent K history
- No passive keyword monitoring or unsolicited replies in normal conversation
- No runtime LLM calls or use of message bodies to personalize insults
- No real-money purchases, wagers, transfers, loot boxes, or paid advantage
- No automatic nickname/role changes or mechanically enforced "punishments"
- No external hosting until the user separately approves it

## 2. Identity and profile

### Required identity

- Application/bot name: **Agent J - M.I.B**
- Supply an original or properly licensed square avatar with the subject inside
  Discord's circular safe area.
- Supply an original or properly licensed banner.
- Keep local artwork outside Git unless redistribution rights are clear. See
  `assets/README.md` and the `AGENT_J_AVATAR_PATH` /
  `AGENT_J_BANNER_PATH` configuration variables.

### Recommended About Me

> Agent J, Aliens Anonymous field ops. I scan suspects, dig up memories, assess
> threats, and run the Blacksite Arena. Y'all bring the alien nonsense—I'm the
> reason it looks good.

This is the default copy unless the user revises it before deployment.

Voice notes for all public profile copy:

- Confident and amused, never stiff or deferential
- Sounds like the cool field agent who already knows the situation is absurd
- Short sentences, active verbs, and a little swagger
- Original writing inspired by Agent J's energy; do not turn the profile into
  a collage of movie quotes

### Recommended presence

- Activity type: Watching
- Activity text: `the Blacksite Arena`
- Alternate rotating statuses can be added later:
  - `Scanning suspicious lifeforms`
  - `Recovering memories you should've left buried`
  - `Making this look good`

## 3. Repository and process isolation

Do not restructure or move the existing Agent K code during Agent J's MVP.
Create Agent J as a self-contained package under:

```text
agent-j/
  package.json
  package-lock.json
  .env.example
  src/
    index.js
    config.js
    commands/
    content/
    activity/
    arena/
    db/
    security/
  test/
    content/
    arena/
    authorization/
  scripts/
    register-commands.js
    diagnostics.js
```

The existing root package remains Agent K.

Use the established local stack unless a compatibility check proves otherwise:
Node.js 20+, ESM, discord.js 14, better-sqlite3, dotenv, and the built-in
`node:test` runner. Pin Agent J's own dependency versions and lockfile; do not
hoist them into Agent K's root package.

Module ownership:

- `index.js`: process lifecycle and Discord client wiring only
- `config.js`: validated non-secret configuration and credential lookup
- `commands/`: thin interaction adapters and response formatting
- `content/`: immutable pools, typed templates, renderers, validators
- `activity/`: metadata-only recent-participant tracking
- `arena/`: state machine, tactics, gadgets, rewards, narration
- `db/`: connection, migrations, repositories, transactions
- `security/`: role checks, opt-outs, mention policy, cooldown reservations

Keep game rules and content generation independent of Discord objects so they
can be exhaustively unit-tested with seeded randomness and a fake clock.

Agent J must use:

- A separate Discord application/client ID
- A separate bot token
- Windows Credential Manager target:
  `MIB Discord Bot Suite - Agent J Token`
- A separate Scheduled Task:
  `MIB Discord Bot Suite - Agent J`
- A separate runtime directory outside Git-tracked/cloud-synced source:
  `%LOCALAPPDATA%\AliensAnonymous\AgentJ`
- A separate SQLite file:
  `%LOCALAPPDATA%\AliensAnonymous\AgentJ\agent-j.sqlite`
- Separate logs under:
  `%LOCALAPPDATA%\AliensAnonymous\AgentJ\logs`
- An optional `AGENT_J_DATA_DIR` override for testing or later hosting

Do not create shared runtime dependencies between Agent J and Agent K in the
first implementation. Duplication is preferable to risking Agent K uptime.
Do not place the live SQLite database in a Git-tracked or cloud-synced source
directory: SQLite locking and cloud-sync conflict copies are an avoidable
corruption risk.

## 4. Discord permissions, roles, and privacy

### Minimal bot permissions

Agent J should request only:

- View Channels
- Send Messages
- Send Messages in Threads when Field Research is allowed in threads or forum
  posts
- Read Message History
- Embed Links
- Use Application Commands

Do not grant:

- Administrator
- Manage Messages
- Manage Roles
- Moderate Members
- Kick Members
- Ban Members

### Gateway intents

Use only what the implementation needs:

- Guilds
- Guild Messages, solely to maintain recent-author activity

Do not store or analyze message bodies. Message Content should not be requested
unless a later approved feature truly requires it. Recent activity can be
tracked from author/channel/timestamp metadata.

### Participation role

Use one or more configured role IDs:

```text
AGENT_J_ACCESS_ROLE_IDS=
AGENT_J_PROTECTED_ROLE_IDS=
```

Default rules:

1. An invoker must have an access role.
2. A target must also have an access role, making the role an implicit
   participation/consent boundary.
3. Bots cannot be targeted.
4. Members with a protected role cannot be targeted or selected as witnesses.
5. Agent J cannot target itself.
6. Administrators receive no bypass: as invokers or targets, they still need a
   configured access role.
7. Validate access again when an interaction is submitted, not only when its
   menu/button was first opened.
8. A participating member may target themselves. Self-targeting consumes the
   invoker and channel cooldowns but does not consume pair, target-wide, or
   anti-dogpile limits.

Discord command permissions should be configured for the access role in Server
Settings → Integrations when possible. Runtime checks remain mandatory because
Discord UI visibility is not an authorization boundary.

### Self-service privacy

Provide an ephemeral slash command:

```text
/agent-j privacy
```

It allows a member to:

- Opt out of being targeted
- Opt out of appearing as the recently active witness
- Opt back in

Store those preferences in Agent J's database. Opting out does not require
removing the access role and does not prevent the member from viewing public
results. Whether opted-out members may invoke commands should be configurable;
default to **no**, because participation should be reciprocal.

### Mentions

Reports may visually reference the target and a recently active witness, but
must suppress notification pings:

```js
allowedMentions: { parse: [], users: [] }
```

Discord should render the user mention text without sending a notification.
Never use `@everyone`, `@here`, or role mentions.

## 5. Initial command catalog

### User context commands

Register these guild-scoped commands:

1. **Scan Subject**
2. **Memory Audit**
3. **Assess Threat**
4. **Challenge in Blacksite Arena**

### Slash commands

```text
/agent-j privacy
/arena rules
/arena profile [member]
/arena leaderboard
```

Later phases add:

```text
/arena inventory
/arena shop
```

There is no `/arena equip` command: a player selects zero or one item for a
specific match after the challenge is accepted. The first-match-of-day bonus is
automatic, so there is no `/arena daily` claim command.

Command rollout follows the delivery phases:

- Reports foundation: `/agent-j privacy`
- Mechanical Arena: `/arena rules`
- Progression: `/arena profile` and `/arena leaderboard`
- Gadget shop: `/arena inventory` and `/arena shop`

Response visibility:

| Command | Default visibility |
|---|---|
| `/agent-j privacy` | Ephemeral |
| `/arena rules` | Ephemeral |
| `/arena inventory` | Ephemeral |
| `/arena shop` | Ephemeral |
| `/arena profile [member]` | Public in the invocation channel |
| `/arena leaderboard` | Public in `#thunderdome`, ephemeral elsewhere |

Successful context-command reports are public in the invocation channel. Arena
challenges and live round results run in `#thunderdome`. Completed match files
are copied to the public, read-only `#arena-records` channel. Temporary
challenge, control, and result cards are deleted from Thunderdome five minutes
after they become terminal or obsolete; the cleanup queue persists in SQLite
so a bot restart cannot strand scheduled deletions. All denials, cooldown
notices, configuration errors, and private tactic/gadget selections are
ephemeral.

For completed matches, the live-card cleanup countdown begins only after the
records-channel copy succeeds. If the records channel is unconfigured or
unavailable, Agent J retains the completed live card and retries archival
instead of deleting the only visible result.

Do not add coin transfers, wagers, gifting, bounties, or administrator economy
commands.

## 6. Shared randomized-content engine

The content must feel improvised while remaining grammatical. Do not generate
reports by concatenating unrestricted random strings. Use typed template
families with compatible slots.

### Pool item format

Each content item should be an immutable object:

```js
{
  id: "unique_stable_id",
  text: "Rendered clause or phrase",
  weight: 1,
  tone: "standard" | "spicy" | "dark",
  tags: ["medical", "sexual", "gore", "bureaucratic"],
  families: ["witness_report"]
}
```

Requirements:

- Stable IDs make tests and anti-repetition reliable.
- `weight` supports rare punchlines without duplicating strings.
- `families` prevents grammatically incompatible combinations.
- `tags` prevent a report from stacking too many similar/dark ideas.
- Content pools live in source-controlled data modules, not the database.
- Use `crypto.randomInt`, not `Math.random`.

### Tone rules

The intended default is edgy and dark, but the funniest output normally has
one strong shock line rather than seven simultaneous shock lines.

Default composition limits:

- At most two items tagged `sexual`, `gore`, or `medical` in one report
- At most one explicit death/funeral/corpse premise per report
- No slurs or attacks based on race, ethnicity, nationality, religion, sex,
  gender identity, sexual orientation, disability, or another protected trait
- No sexual violence and no sexual content involving minors
- No suicide/self-harm jokes directed at a member
- Never use real personal data or target a real disease, disability,
  bereavement, disclosed trauma, family tragedy, abuse, or mental illness
- Never make a real allegation that a member committed a crime or abuse
- No credible threat, doxxing, or instruction to harm a real person
- Fictional anatomy, death, drugs, cults, criminality, sexual incompetence,
  government experiments, and absurd bodily failures are allowed as curated
  jokes

This is not a generic profanity filter. It is a writing constraint that keeps
the roast fictional and absurd rather than accidentally personal.

### Anti-repetition

Maintain rolling in-memory history per guild:

- Last 10 complete result signatures per command
- Last 5 selected item IDs per pool
- Last 5 witnesses selected per channel

When selecting:

1. Exclude recently used IDs when alternatives exist.
2. Retry a complete signature up to five times.
3. Permit a repeat after retries rather than failing the command.

Restarting the bot may reset this history. Persistence is unnecessary for MVP.

### Shared cooldowns

Launch defaults:

| Limit | Scan Subject | Memory Audit | Assess Threat |
|---|---:|---:|---:|
| Same invoker + command | 45 seconds | 120 seconds | 45 seconds |
| Same invoker → target pair | 10 minutes | 30 minutes | 10 minutes |
| Target-wide | 90 seconds | 5 minutes | 90 seconds |
| Channel-wide output | 8 seconds | 8 seconds | 8 seconds |

In addition, a member may be the target of at most eight successful public
reports across all three commands in any rolling hour. This cap prevents a
crowd from repeatedly dogpiling one person.

Cooldown state must be reserved before rendering or sending so simultaneous
interactions cannot race through the checks. A failed Discord delivery releases
the reservation. A successful delivery commits it. Self-targeting consumes only
the invoker + command and channel-wide limits. Arena challenges are governed
separately.

Cooldown failures must be ephemeral and include the remaining time.

## 7. Recently active witness selection

Agent J needs recent participation metadata for observation/ad-lib fields.

Maintain:

```text
Map<guildId:channelId, OrderedMap<userId, lastSeenTimestamp>>
```

On every eligible human `messageCreate`:

1. Store only guild ID, channel ID, user ID, and timestamp.
2. Do not store content, attachments, embeds, or message IDs.
3. Keep a maximum of 25 users per channel.
4. Remove entries older than 30 minutes.

Witness candidates must:

- Have spoken in the same channel within 30 minutes
- Have the participation role
- Not be the target
- Not be the invoker
- Not be a bot
- Not be protected or opted out
- Not have served as a witness in that channel in the last 20 minutes when
  another candidate exists

Select with recency weighting:

- 0–5 minutes: weight 6
- 6–10 minutes: weight 5
- 11–15 minutes: weight 4
- 16–20 minutes: weight 3
- 21–25 minutes: weight 2
- 26–30 minutes: weight 1

Fallback witnesses, selected randomly when no member is eligible:

- `an unpaid Bureau intern`
- `a traumatized Roomba`
- `the night-shift coroner`
- `three Worm Guys on their lunch break`
- `a visibly exhausted federal veterinarian`
- `a neuralyzed divorce attorney holding the wrong briefcase`
- `an Area 51 janitor with temporary diplomatic immunity`
- `a livestock investigator who has stopped asking which livestock`
- `the haunted fax machine from Evidence Room B`
- `a government clone still wearing the original's name tag`

Memory Audit rotates through eight live-witness sentence structures and eight
fictional/no-live-witness structures. Word-bank history prevents immediate
template reuse. The 60% live-witness ceiling remains unchanged.

## 8. Scan Subject specification

### Interaction

The invoker right-clicks a member and chooses **Apps → Scan Subject**.
After authorization and cooldown checks, Agent J posts one public embed.

### Required report fields

```text
M.I.B. XENOBIOLOGICAL SCAN
Subject
Species
Origin
Anatomical anomaly
Threat level
Known weakness
Bureau observation
Disposition
Scan confidence
```

Every field is freshly randomized on every scan. Do not assign a permanent
species, anomaly, or origin.

Recommended initial pool sizes:

- Species: 40
- Origin: 30
- Anatomical anomaly: 50
- Threat level: 30
- Known weakness: 40
- Disposition: 30
- Scan confidence formatting: 15

### Bureau observation grammar

The observation should incorporate:

- `Y`: recently active witness or fallback
- `Z`: reaction/interaction involving Y
- `X`: targeted member
- `W`: absurd action performed by X
- `V`: resulting outcome

Implement several families:

```text
WITNESS:
@Y {reaction Z} after @X {action W}, causing {outcome V}.

SURVEILLANCE:
Bureau footage shows @Y {response Z} when @X {action W}; the incident {outcome V}.

MEDICAL:
@Y was treated for {reaction Z} after @X {action W}, resulting in {outcome V}.

CRIMINAL:
@Y contacted Agent J after discovering that @X {action W}; investigators later found {outcome V}.

INSURANCE:
@Y filed a federal insurance claim after @X {action W}, causing {outcome V}.

CORONER:
The night-shift coroner interviewed @Y after @X {action W}; the final report states {outcome V}.
```

Each family must have its own compatible Z/W/V pools. Do not share a clause
across families unless its grammar is explicitly compatible.

### Scan output budget

- Target rendered length: 700–1,300 characters
- Hard maximum: 1,800 characters
- If a render exceeds the hard maximum, reroll or drop an optional observation
  clause; never slice text mid-sentence

### Acceptance examples

Good:

> @Witness requested witness protection after @Target attempted to cauterize a
> hemorrhoid with a Noisy Cricket, causing three federal coroners to resign and
> one raccoon to inherit the server.

Bad:

> @Witness swallowed because @Target one testicle causing fitted sheets.

The second example demonstrates why typed slots are mandatory.

## 9. Memory Audit specification

### Interaction

The invoker right-clicks a member and chooses **Apps → Memory Audit**. Agent J
posts one fictional recovered-memory report.

### Required fields

```text
UNAUTHORIZED MEMORY RECOVERY
Subject
Recovered period/date
Classified location
Recovered narrative (two short paragraphs)
Reason for neuralyzation
Residual symptom
Recommended treatment
Recovery confidence
```

### Narrative families

Create at least eight separately tested families:

1. Alien abduction
2. Suppressed childhood incident
3. Missing weekend
4. Previous life
5. Failed government experiment
6. Memory from the future
7. Botched funeral
8. Cult initiation
9. Classified former employment

Recommended pool sizes:

- Period/date: 20
- Location: 30
- Accomplice/witness reaction: 35
- Central incident: 60
- Object/evidence: 40
- Neuralyzation reason: 40
- Residual symptom: 50
- Treatment: 30

At least half of the central incidents and residual symptoms should be in the
`spicy` or `dark` tone. Dark content remains fictional and absurd.

### Narrative construction

Memory Audit should use complete paragraph templates rather than displaying
every slot as a list. A family owns:

- opening sentence
- escalation sentence
- optional witness sentence
- neuralyzation explanation

The residual symptom and treatment appear as separate embed fields.

Use a recently active eligible witness in no more than 60% of audits. The
remaining audits should use a fictional accomplice so the same channel members
are not constantly dragged into reports.

### Memory Audit output budget

- Target rendered length: 850–1,500 characters
- Hard maximum: 1,800 characters
- Prefer two compact narrative paragraphs over a wall of embed fields
- If over budget, remove an optional escalation sentence before rerolling

## 10. Threat Assessment specification

### Interaction

The invoker right-clicks a member and chooses **Apps → Assess Threat**. Agent J
posts a compact assessment optimized for repeat use.

### Required fields

```text
INTERGALACTIC THREAT ASSESSMENT
Subject
Threat classification
Combat capability
Primary attack
Defensive response
Known weakness
Likely casualty
Containment protocol
Survival probability
Sensor confidence
```

Recommended pool sizes:

- Classification: 30
- Combat capability: 40
- Primary attack: 35
- Defensive response: 35
- Weakness: 40
- Likely casualty: 30
- Containment protocol: 30

Choose a random internal threat tier from 0–5. Pool items may declare compatible
tiers. In 80% of results, select compatible items. In 20%, deliberately select
one contradictory field for comedic effect—for example, a
`Civilization-Ending Dumbass` whose only attack is an unsolicited voice message.

Generate survival probability from weighted tier ranges, not uniformly:

- Tier 0: 85–100%
- Tier 1: 70–95%
- Tier 2: 45–85%
- Tier 3: 20–70%
- Tier 4: 5–45%
- Tier 5: 1–25%

### Threat Assessment output budget

- Target rendered length: 500–1,000 characters
- Hard maximum: 1,500 characters
- Keep this command faster and punchier than Scan Subject or Memory Audit

## 11. Blacksite Arena overview

Public name: **The Blacksite Arena**

Primary channel: the existing `#thunderdome` channel, configured by ID.

Agent J is the announcer and visibly corrupt referee. The game is lightweight,
mostly luck-based, and gives each player one quick tactical choice per round. It
must be entertaining to read even when a player loses. An accepted match should
normally finish in 60–120 seconds when both players respond promptly.

### Challenge interaction

1. Challenger right-clicks an eligible member and selects
   **Apps → Challenge in Blacksite Arena**.
2. Agent J creates a public match file in the configured `#thunderdome`
   channel. If invoked elsewhere, the invoker receives an ephemeral jump link.
3. The message names both players and provides **Accept**, **Decline**, and a
   participant-only **Browse Shop** shortcut.
4. Only the named opponent may accept or decline.
5. The challenge expires after 60 seconds.
6. On acceptance, a ranked fight opens its private equipment window. Once both
   loadouts are locked, Agent J posts a fresh Round 1 control at the bottom of
   the channel with **Choose Tactic**. Modes without equipment receive that
   fresh prompt immediately after acceptance.
7. Each participant clicks that button and receives an ephemeral selector for
   **Blast**, **Shield**, or **Dirty Trick**.
8. The latest public control may say who has locked in, but never reveals a
   tactic before both choices are committed.
9. Once both choices are stored, Agent J resolves and narrates the round,
   updates the original archival match file, and posts a fresh round-result
   card at the bottom of the channel. If another round is needed, that new card
   carries the only active **Choose Tactic** button.
10. The first participant to win two rounds wins the match.

No member may have more than one pending or active match.

When the later gadget phase exists, acceptance first opens a 20-second optional
loadout window. Each player can privately select one owned gadget or
**No gadget**. No response defaults to no gadget and does not abandon the
match. Exhibition matches skip this window because gadgets are disabled.

### Tactics

- **Blast** beats **Dirty Trick**
- **Dirty Trick** beats **Shield**
- **Shield** beats **Blast**

The choice matters without overcoming luck. Players choose again every round;
the game must not reuse a previous choice automatically.

Round formula:

```text
rawRoll = cryptographically random integer 1–100
tacticBonus = +15 when the tactic beats the opponent, otherwise 0
gadgetModifier = item-specific, otherwise 0
roundTotal = rawRoll + tacticBonus + gadgetModifier
```

Identical tactics give both players zero tactic bonus. The higher total wins.
On an exact tie, reroll the raw d100 for both players while preserving their
tactics and tactic bonuses. Do not retrigger a gadget effect. Repeat only if
the new totals tie again.

Resolve each round in this exact order:

1. Commit both hidden tactic selections.
2. Generate both raw d100 rolls.
3. Apply mandatory rerolls from gadgets.
4. Calculate tactic bonuses.
5. Resolve any gadget chance or misfire.
6. Apply numeric gadget modifiers.
7. Calculate and compare totals.
8. Resolve ties as described above.
9. Persist the round.
10. Persist the next control generation, update the archival match file, and
    post the fresh round result/control.

The public result must show both tactics, raw rolls, tactic bonuses, gadget
effects, and final totals. Transparency is part of the entertainment and avoids
arguments that the bot invented a winner.

### Round narration

Narration uses typed pools based on:

- winner's tactic
- loser's tactic
- selected gadget
- margin of victory

Each match should produce:

1. One short narration per resolved round
2. Final finishing-blow line
3. Winner and reward
4. Loser and consolation reward
5. Updated streaks

The narration may call Agent J corrupt, biased, or suspicious, but the
underlying arithmetic must match the displayed rolls. Do not delay resolution
with artificial typing timers. Post exactly one new public card per resolved
round—not one per click—so the result and next move remain visible in active
chat.

### Timeouts, abandonment, and cancellation

- Players have 35 seconds to commit a tactic for each round. The clock begins
  only after the fresh control message is successfully registered.
- Every public tactic control and private tactic selector is bound to its exact
  round number. Only the newest public control works; old or forged controls
  cannot submit into a later round.
- If one player times out after acceptance, the match becomes `abandoned`.
- An abandoned match grants no credits, reputation, win/loss, streak change, or
  leaderboard result to either player.
- Only the participant responsible for the timeout receives a five-minute Arena
  cooldown.
- Three abandonments by the same member in a rolling 24 hours create a one-hour
  Arena lockout for that member.
- Expired unaccepted challenges and explicit declines are not abandonments.
- A restart, Discord API failure, deleted match message, or other system failure
  produces `technical_cancel`, never an abandonment.
- Any reserved gadgets are returned when a match does not complete.

Do not regenerate or continue a partially resolved match after a restart. A
clean cancellation is safer than presenting different rolls.

### Arena cooldowns

- Challenger-wide: 90 seconds after a challenge is successfully posted
- Same unordered player pair: 10 minutes after a challenge is posted
- One pending/active match per member
- Abandonment penalties: as defined above

Failures are ephemeral and state the remaining time. Cooldowns and active-match
locks must be checked and reserved transactionally.

### Deferred arena anomalies

Random referee events are not part of the initial game. They may be tested
later only after the base tactic probabilities are understood. Any future event
must be symmetrical, publicly disclosed, incapable of removing currency, and
covered by simulation tests.

## 12. Arena economy

Currency: **Blacksite Credits**, displayed as `BC`

### Starting and earning values

- New participant starting balance: 20 BC
- Win: 12 BC
- Loss: 4 BC
- First completed match of the UTC day: +5 BC
- Win-streak bonus: +2 BC at two consecutive wins, +4 BC at three, and
  +6 BC at four or more
- Match earnings cap: 60 BC per user per UTC day

There are no draws because tied rounds reroll. Declined, expired, abandoned, and
technically cancelled matches pay nothing. The 60 BC cap includes win/loss
rewards, first-match bonus, streak bonus, and Fake Bureau Badge bonus. Clamp a
reward to the remaining allowance rather than exceeding the cap, and disclose
the clamp in the result.

### Anti-farming

Treat a player pair as unordered. Within a rolling 24-hour period:

- First completed match: ranked with full rewards
- Second completed match: ranked with full rewards
- Third and later: exhibition only

Exhibition matches award no credits or reputation, change no wins/losses or
streaks, and do not permit gadgets. Label the challenge and final result
**Exhibition — no progression** before the opponent accepts.

Do not add wagering, transfers, real-money purchases, loot boxes, or negative
balances.

### Arena reputation

Keep reputation separate from spendable currency:

- Win: +10 reputation
- Loss: +3 reputation
- No daily cap
- Exhibition matches: +0 reputation

Reputation unlocks cosmetic titles only. It never increases combat rolls.

## 13. Gadget design

Gadgets should create one interesting moment, not permanent stat inflation.

The mechanical Arena MVP initially launched with no economy, shop, or gadget
effects. The base match loop has since been live-tested, so credits, equipment
selection, and the shop are now the approved next stage.

All launch gadgets are one-match consumables:

- A player may select zero or one gadget per ranked match.
- A selected gadget is reserved transactionally before combat.
- It is consumed only when that ranked match completes.
- It is returned after decline, expiry, abandonment, or technical cancellation.
- Inventory quantity is capped at 20 of each gadget per member.
- Exhibition matches cannot use or consume gadgets.
- There is no permanent equipment, durability, passive stacking, or hidden
  stat progression.

Pending standard challenge cards include **Browse Shop** beside Accept and
Decline. Either assigned fighter may use it to open the gadget catalog
ephemerally and purchase before acceptance. Other members are rejected, the
public challenge card is not altered, and the normal post-acceptance equipment
phase remains authoritative.

Planned catalog and launch prices:

| Gadget | Price | Exact effect |
|---|---:|---|
| Noisy Cricket | 18 BC | The owner's first Blast round receives +10. |
| Pocket Shield Generator | 18 BC | The owner's first Shield round receives +10. |
| Cephalopod Ink Capsule | 18 BC | The owner's first Dirty Trick round receives +10. |
| Neuralyzer | 24 BC | The owner's first raw roll of 25 or lower is rerolled once; the replacement is mandatory. |
| Alien Energy Drink | 22 BC | Owner gets +7 in rounds one and two, then −7 in round three if it occurs. |
| Unlicensed Teleporter | 12 BC | Before round one, a visible coin flip gives either the owner or opponent +12 for that round. |
| Series 4 De-Atomizer | 28 BC | On the owner's first Blast round: 75% chance of +18, 25% chance of −12. |
| Fake Bureau Badge | 14 BC | No combat effect. A ranked win earns +8 BC; a ranked loss earns 0 BC instead of 4. Daily cap still applies. |

Ship the first six only after balance simulations. Treat the Series 4
De-Atomizer and Fake Bureau Badge as a second shop batch because they add
variance and economy effects. Prices are approved planning values but must
still be verified by simulation before production registration.

Do not implement ordinary reusable combat gear, durability, trading, wagers,
reactive mid-roll prompts, nickname effects, or Discord-role rewards. The sole
approved exception is the disclosed Full Blacksite Artifact ruleset below.

### Additional approved standard gadgets

| Gadget | Price | Exact effect |
|---|---:|---|
| Worm Guy Burner Phone | 55 BC | +12 in round three. |
| Lizard-Skin Briefcase | 70 BC | +8 while its owner is behind in match score. |
| Swamp-Gas Canister | 75 BC | +10 when both fighters select the same tactic. |
| Questionably Licensed De-Atomizer | 110 BC | Blast's favorable bonus against Dirty Trick becomes +25. |
| Taxpayer-Funded Force Field | 110 BC | Shield's favorable bonus against Blast becomes +25. |
| Evidence-Locker Switcheroo | 110 BC | Dirty Trick's favorable bonus against Shield becomes +25. |
| Neuralyzer Mk II | 160 BC | First round lost by 10 or less rerolls the owner's raw d100 once. |
| Reverse-Engineered Tic Tac Drive | 225 BC | Once per match, removes the opponent's +15 tactic bonus when the owner is countered. |
| Black-Budget Tailored Suit | 300 BC | +8 to every round. |

### Full Blacksite Artifacts

Artifacts are permanent, account-bound shop unlocks. They may be used only in
a `/arena blacksite` challenge that identifies the Artifact publicly before
the opponent accepts. Declining has no Artifact cost. Acceptance charges the
activation fee and starts a seven-day per-Artifact cooldown. Incomplete or
technically cancelled matches return the fee and cooldown.

Full Blacksite fights use separate win/loss statistics and never affect
ordinary credits, reputation, standard wins/losses, or streaks. An Artifact
cannot be combined with an ordinary gadget.

| Artifact | Unlock | Activation | Exact effect |
|---|---:|---:|---|
| The Galaxy on Orion's Belt | 2,500 BC | 75 BC | +15 to every round. |
| Neuralyzer Omega | 4,000 BC | 100 BC | The owner's first lost round is replayed with the same tactics and fresh rolls. |
| Little Red Button | 5,000 BC | 125 BC | The owner's first loss by 50 or less becomes a win by one. |
| Executive Continuity Seal | 6,666 BC | 150 BC | Owner starts 1-0 and receives +10 in remaining rounds. |

## 14. Arena profiles, titles, and shop

### Simple presentation cosmetics

Cosmetics use native Discord embeds only. Do not generate image cards in the
initial rollout.

- Case-file themes change the embed accent color, heading, and footer.
- Victory stamps add a selected text stamp to the winner's final result.
- Broadcast Packs append one stable thematic line to an existing round-result
  embed; they do not create additional commentary messages or obscure the
  tactic/roll arithmetic.
- The challenger's selected theme and Broadcast Pack are snapshotted when a
  challenge is created. The winner's selected stamp is snapshotted when the
  match completes.

Initial prices:

| Item | Price |
|---|---:|
| Redacted Case File theme | 250 BC |
| Majestic-12 theme | 400 BC |
| Radioactive Evidence theme | 300 BC |
| SUBJECT CONTAINED stamp | 100 BC |
| EXPENSE REPORT DENIED stamp | 125 BC |
| DEFINITELY NOT A WEATHER BALLOON stamp | 200 BC |
| Bureau HR Broadcast Pack | 450 BC |
| Conspiracy AM Radio Broadcast Pack | 500 BC |
| Worm Guys Commentary Pack | 600 BC |
| UAPGerb Remote Correspondent Pack | 650 BC |

### Profile fields

```text
Member
Blacksite Credits
Arena reputation
Wins / losses
Current streak
Best streak
Inventory summary
Selected title
Largest recorded defeat margin
```

### Cosmetic title examples

Initial reputation unlocks:

| Reputation | Title |
|---:|---|
| 0 | Probationary Specimen |
| 30 | Mostly Harmless |
| 75 | Unlicensed Combatant |
| 150 | Arena Liability |
| 300 | Blacksite Menace |
| 600 | Geneva Suggestion |
| 1,000 | Zed's Tax Write-Off |

Titles must be selected by the user and displayed only in Agent J embeds.
The user's own `/arena profile` response should offer an ephemeral title
selector containing only unlocked titles. Agent J should not create or modify
real Discord roles or nicknames. Achievement-specific titles such as
`Noisy Cricket Survivor` are a later polish feature and need separate, explicit
unlock criteria.

### Leaderboard

Provide separate views:

- Reputation
- Wins
- Win percentage
- Best streak

The win-percentage board requires at least ten ranked matches. Never rank
members by currency spent or losses. Exhibition matches do not affect any
leaderboard.

## 15. Data model

Use SQLite in
`%LOCALAPPDATA%\AliensAnonymous\AgentJ\agent-j.sqlite`. Enable WAL mode,
foreign keys, and a 5,000 ms busy timeout. Apply numbered migrations and record
the current schema version. Tests must use a disposable database outside the
live runtime directory.

### `agent_j_users`

```text
guild_id TEXT NOT NULL
user_id TEXT NOT NULL
credits INTEGER NOT NULL DEFAULT 20
reputation INTEGER NOT NULL DEFAULT 0
wins INTEGER NOT NULL DEFAULT 0
losses INTEGER NOT NULL DEFAULT 0
current_streak INTEGER NOT NULL DEFAULT 0
best_streak INTEGER NOT NULL DEFAULT 0
selected_title TEXT
target_opt_out INTEGER NOT NULL DEFAULT 0
witness_opt_out INTEGER NOT NULL DEFAULT 0
daily_earned INTEGER NOT NULL DEFAULT 0
daily_earned_date TEXT
arena_locked_until TEXT
created_at TEXT NOT NULL
updated_at TEXT NOT NULL
PRIMARY KEY (guild_id, user_id)
```

Creating a user and granting the opening 20 BC must happen exactly once. If the
economy ledger is already enabled, create an `opening_grant` ledger row in the
same transaction.

### `arena_matches`

```text
id TEXT PRIMARY KEY
guild_id TEXT NOT NULL
channel_id TEXT NOT NULL
message_id TEXT
challenger_id TEXT NOT NULL
opponent_id TEXT NOT NULL
pair_key TEXT NOT NULL                 # sorted user IDs
status TEXT NOT NULL
ranked INTEGER NOT NULL DEFAULT 1
current_round INTEGER NOT NULL DEFAULT 0
challenger_round_wins INTEGER NOT NULL DEFAULT 0
opponent_round_wins INTEGER NOT NULL DEFAULT 0
challenger_gadget_id TEXT
opponent_gadget_id TEXT
challenger_gadget_reserved INTEGER NOT NULL DEFAULT 0
opponent_gadget_reserved INTEGER NOT NULL DEFAULT 0
winner_id TEXT
abandoned_by_user_id TEXT
challenger_reward INTEGER NOT NULL DEFAULT 0
opponent_reward INTEGER NOT NULL DEFAULT 0
created_at TEXT NOT NULL
accepted_at TEXT
last_transition_at TEXT NOT NULL
resolved_at TEXT
expires_at TEXT NOT NULL
```

Statuses:

```text
pending
equipment_select
round_select
complete
declined
expired
abandoned
technical_cancel
```

Allowed state transitions:

| Current | Event | Next |
|---|---|---|
| `pending` | Opponent accepts, gadgets disabled | `round_select` |
| `pending` | Opponent accepts, gadgets enabled | `equipment_select` |
| `pending` | Opponent declines | `declined` |
| `pending` | 60-second deadline | `expired` |
| `equipment_select` | Both choose or 20-second deadline | `round_select` |
| `round_select` | Round resolved, neither has two wins | `round_select` for the next round |
| `round_select` | Round resolved, one has two wins | `complete` |
| `round_select` | Tactic deadline missed | `abandoned` |
| `equipment_select` or `round_select` | System failure/restart | `technical_cancel` |

Terminal states have no outgoing transitions. Every write must use a conditional
expected-state update; a stale button cannot reopen or alter a terminal match.

Use a partial/indexed lookup on guild, participant IDs, and active statuses to
enforce one pending/active match per member. Use `pair_key`, status, and
`resolved_at` for the rolling 24-hour ranked/exhibition decision.

### `arena_rounds`

```text
match_id TEXT NOT NULL REFERENCES arena_matches(id)
round_number INTEGER NOT NULL
challenger_tactic TEXT NOT NULL
opponent_tactic TEXT NOT NULL
challenger_initial_roll INTEGER NOT NULL
opponent_initial_roll INTEGER NOT NULL
challenger_final_raw_roll INTEGER NOT NULL
opponent_final_raw_roll INTEGER NOT NULL
challenger_tactic_bonus INTEGER NOT NULL
opponent_tactic_bonus INTEGER NOT NULL
challenger_gadget_effect TEXT
opponent_gadget_effect TEXT
challenger_gadget_modifier INTEGER NOT NULL DEFAULT 0
opponent_gadget_modifier INTEGER NOT NULL DEFAULT 0
tie_rolls_json TEXT
challenger_total INTEGER NOT NULL
opponent_total INTEGER NOT NULL
winner_id TEXT NOT NULL
narration_id TEXT NOT NULL
resolved_at TEXT NOT NULL
PRIMARY KEY (match_id, round_number)
```

The round row is the auditable source for the public arithmetic. `tie_rolls_json`
contains only numeric rerolls, never arbitrary user content.

### `arena_inventory`

```text
guild_id TEXT NOT NULL
user_id TEXT NOT NULL
gadget_id TEXT NOT NULL
quantity INTEGER NOT NULL DEFAULT 0
PRIMARY KEY (guild_id, user_id, gadget_id)
CHECK (quantity >= 0 AND quantity <= 20)
```

### `economy_ledger`

```text
id TEXT PRIMARY KEY
idempotency_key TEXT NOT NULL UNIQUE
guild_id TEXT NOT NULL
user_id TEXT NOT NULL
amount INTEGER NOT NULL
balance_after INTEGER NOT NULL
reason TEXT NOT NULL
reference_id TEXT
created_at TEXT NOT NULL
```

Every balance change must create a ledger row in the same transaction.

### `arena_abandonments`

```text
match_id TEXT NOT NULL
guild_id TEXT NOT NULL
user_id TEXT NOT NULL
occurred_at TEXT NOT NULL
PRIMARY KEY (match_id, user_id)
```

Use this table to count the rolling 24-hour abandonment threshold. Periodically
prune records older than the retention window after they can no longer affect a
lockout.

## 16. Match integrity and recovery

SQLite is authoritative for every match, round, gadget reservation, reward, and
lock. In-memory timers may wake handlers, but they must never be the only copy
of game state.

### Idempotency

Complete a match inside one SQLite transaction:

1. Read match.
2. Confirm status is `round_select` and neither participant already has two
   round wins.
3. Resolve and insert the final round once.
4. Set status to `complete`, winner, rewards, and timestamps.
5. Update ranked wins/losses, reputation, streaks, daily earnings, and balances.
6. Mark reserved gadgets consumed. Exhibition matches never have reservations.
7. Write uniquely keyed ledger rows.
8. Commit.

A duplicate interaction must observe the existing round or `complete` status
and perform no additional roll, inventory change, stat change, or reward.

Purchases and gadget reservations also require transactions:

- Purchase: re-check price and inventory cap, debit credits, increment quantity,
  and write the ledger together.
- Select: verify ranked match and ownership, decrement quantity, record the
  gadget and reservation flag together.
- Non-completion: increment any reserved quantity and clear its reservation flag
  exactly once.

Never accept a balance, price, reward, roll, tactic, or gadget effect supplied by
the Discord client.

### Deadline sweeper

Run a database-backed sweeper approximately every 15 seconds:

- Expired `pending` → `expired`
- Expired `equipment_select` → default missing selections to no gadget and open
  round one
- Expired `round_select` → `abandoned`, identify the nonresponding participant,
  refund all gadget reservations, release both active-match locks, and apply the
  responsible member's abandonment cooldown/lockout

Each transition must be conditional on the expected old status so the sweeper
and an interaction handler cannot both perform it.

### Restart recovery

On startup:

- Expire `pending` matches whose `expires_at` has passed.
- Change every `equipment_select` or `round_select` match to
  `technical_cancel`.
- Refund reserved gadgets and release active-match locks transactionally.
- Award no credits, reputation, stats, or abandonment strike.
- Never regenerate a partially stored round or attempt to reconstruct hidden
  selections from Discord.
- Best-effort edit the public message after the database commit. If the message
  cannot be fetched, keep the database cancellation and log only IDs/error.

### Interaction authorization

Custom IDs should contain a compact match ID and action, never user-controlled
economic values. Every button handler must load the match and verify:

- Guild and channel
- Expected participant
- Expected match status
- Interaction has not expired
- Member still exists

Tactic and gadget custom IDs may contain only allowlisted identifiers. All
authorization, inventory, and rule lookups come from server-side configuration
and SQLite.

## 17. Logging and diagnostics

Log only:

- event type
- guild/channel/user IDs
- command/result family
- match ID and status transition
- reward amounts
- error class/message

Do not log:

- bot tokens
- MFA material
- message content
- generated roast text
- full Discord interaction payloads

Provide a diagnostic command or script that reports:

- bot login state
- database availability
- registered command names
- pending match count
- stale match count
- no secret values

## 18. Required tests

### Content engine

- Every pool has unique stable IDs.
- Every template renders without `undefined`, unresolved `{slots}`, malformed
  mention syntax, double punctuation, or accidental blank fields.
- Each family accepts only compatible slot items.
- Reports contain no raw `@everyone` or `@here` and suppress all notification
  pings.
- Anti-repetition avoids recent items when alternatives exist.
- Dark-tag limits are enforced.
- Fallback witnesses work with an empty activity queue.
- Protected, opted-out, target, invoker, and bot users are excluded.
- Species/anomaly/threat fields are freshly selected on repeated scans.
- Character budgets are respected without truncating a sentence.
- Run at least 10,000 seeded renders for each report type and fail on any
  structural violation.

### Authorization and cooldowns

- Missing access role is denied ephemerally.
- Nonparticipating targets are denied.
- Participating members may target themselves under the documented exemptions.
- Privacy opt-out is honored immediately.
- Protected roles cannot be bypassed by stale buttons.
- Cooldowns are scoped correctly and report remaining time.
- Concurrent requests cannot exceed the target cap.
- Failed Discord delivery releases a reserved cooldown; successful delivery
  commits it.

### Arena

- Only opponent can accept/decline.
- Self/bot/protected challenges fail.
- A user cannot enter two active matches.
- Tactic matchup is correct for all nine pairings.
- Tactics remain private until both players commit.
- A fresh tactic is required every round.
- Raw rolls, bonuses, gadget effects, and public totals agree exactly.
- Tie rerolls preserve bonuses and never retrigger gadgets.
- Gadget effects trigger at most as designed.
- A match resolves exactly once.
- Rewards cannot be duplicated.
- First/second same-pair matches are ranked; third and later are exhibitions.
- Pair, challenger, abandonment, and daily limits are correct at exact time
  boundaries.
- Starting balance is created exactly once.
- Ledger balance matches user balance.
- Declined, expired, abandoned, and technical-cancel matches grant no rewards or
  stats.
- Abandonment penalizes only the responsible participant.
- Gadget reservations are returned exactly once on non-completion.
- Gadgets cannot be selected at zero quantity or in exhibitions.
- Inventory cannot exceed 20 of one gadget.
- Startup recovery never regenerates a partial round.
- Leaderboard queries are guild-scoped.
- Run at least 100,000 seeded simulated matches for tactic symmetry, expected
  tactic advantage, every gadget, streak rewards, and daily caps.

### Live verification

Use only a private testing channel. For every live test:

1. Capture the source and bot message IDs.
2. Verify the visible output and authorization behavior.
3. Delete the test messages.
4. Remove generated deletion-log messages if a logging bot posts them.
5. Do not test in public channels without explicit user approval.

## 19. Delivery phases

### Phase 0 — profile and application

- Create separate Agent J application
- Configure name/avatar/About Me/banner
- Store token in the separate Credential Manager target
- Install with minimal permissions
- Configure access/protected role IDs
- Verify private login only

### Phase 1 — shared entertainment engine

- Create isolated `agent-j/` package
- Implement config, credentials, logging, database, role checks, privacy command,
  recent-activity tracker, cooldowns, and content renderer
- Add comprehensive unit tests

### Phase 2 — reports

- Implement Scan Subject first
- Validate grammar and anti-repetition
- Add Memory Audit
- Add Threat Assessment
- Perform private cleaned-up live tests

### Phase 3 — mechanical Arena MVP

- Implement challenge routing to `#thunderdome`, acceptance, per-round hidden
  tactics, transparent d100 resolution, best-of-three narration, timeouts,
  cancellation, and persistent round records
- Treat all matches as exhibition during this phase: no credits, reputation,
  stats, streaks, shop, or gadgets
- Validate the full loop privately before inviting members
- Run simulation tests across at least 100,000 generated matches to confirm
  symmetric win rates for equal tactics and expected tactic advantage

### Phase 4 — progression and anti-farming

- Add 20 BC opening grants, ranked wins/losses, reputation, streaks,
  first-match bonus, daily cap, same-pair exhibition rules, profiles, and
  leaderboards
- Add the economy ledger and verify it reconciles exactly with balances
- Run with a small member group and review completion, abandonment, rematches,
  progression rate, and challenge spam
- Adjust reward/cooldown values only through reviewed configuration changes

### Phase 5 — first gadget shop

- Add `/arena inventory` and `/arena shop`
- Add the Noisy Cricket, Pocket Shield Generator, Cephalopod Ink Capsule,
  Neuralyzer, Alien Energy Drink, and Unlicensed Teleporter
- Implement one-gadget-per-match selection and transactional reservations
- Simulate prices/effects before enabling purchases

### Phase 6 — advanced gadgets and polish

- Re-simulate and, if healthy, add the Series 4 De-Atomizer and Fake Bureau
  Badge
- Add cosmetic titles
- Expand narration pools
- Consider additional report families
- Consider optional scan appeal/second-opinion buttons

### Phase 7 — optional later experiments

- Symmetrical Arena anomaly events
- Seasonal cosmetic titles or limited-time narration
- Additional non-economic game modes
- Never add wagers, purchased currency, or permanent combat power without a new
  explicit product decision

## 20. Explicit instructions for the implementation model

1. Read this document and the public setup/security guides before editing.
2. Do not modify or restart Agent K until Agent J has its own application ID and
   token.
3. Do not invent Discord IDs. Record IDs only after reading them from Discord.
4. Do not store tokens or MFA data in Git or documentation.
5. Use a separate package, database, credential, log, and Scheduled Task.
6. Implement phases in order. Do not build the shop before Arena MVP telemetry.
7. Prefer curated typed content pools over LLM-generated insults.
8. Treat role checks, opt-outs, cooldowns, and idempotent rewards as required
   product behavior, not optional cleanup.
9. Keep live tests inside an operator-designated test channel and remove test
   output afterward.
10. Review security and privacy implications before deploying to an external
    host or granting any new Discord permission.
11. Do not collapse the per-round tactic flow into one whole-match selection.
12. Do not put the live SQLite database inside a Git-tracked or cloud-synced
    source directory.
13. Do not silently alter the formulas, timers, rewards, prices, status names,
    or anti-farming thresholds in this specification.

## 21. Decisions still requiring the user

Do not block planning on these, but ask before their relevant phase:

- Final banner artwork
- Whether opted-out users may still invoke entertainment commands
- Whether Memory Audit should always include dark pools or expose a separate
  unredacted mode
- Whether gadget simulations justify adjusting any planned price before launch
- Whether Agent J remains locally hosted or moves to an always-on host

Example deployment decisions:

- Create a non-administrative participation role such as
  **M.I.B. Field Clearance** and place its ID in
  `AGENT_J_ACCESS_ROLE_IDS`.
- Start with one consenting tester.
- Add protected roles to `AGENT_J_PROTECTED_ROLE_IDS` when needed.
- Configure dedicated Arena and Arena-records channels through `agent-j/.env`.
  `AGENT_J_TEST_CHANNEL_ID` is optional and supplies only the default channel
  for the research test-anchor utility.
- Keep `AGENT_J_ALLOW_OPTED_OUT_INVOKERS=false` unless the server explicitly
  adopts a different policy.
