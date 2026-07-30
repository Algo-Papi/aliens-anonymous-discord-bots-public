# Earth Intel operating specification

## Purpose

Earth Intel is a selective breaking-news service inside Agent K. It is not a
general news firehose and it is not intended to reproduce a social-media
timeline. Its job is to surface consequential events that matter to a
U.S.-majority Discord server while still catching the rare foreign event with
major global consequences.

The normal target is one to five new story cards per calendar day. Six is a
soft cap; after that point only confirmed or critical events may create another
top-level story. Updates to an existing event remain in that event's public
discussion thread and do not consume another top-level slot.

## Live sources

The canonical source list is `src/intel/runtime-sources.js`. Agent K renders
that list into a pinned Discord registry, so the visible registry and the
runtime configuration cannot quietly drift apart.

### Fast discovery and newsroom confirmation

- BNO News (`@BNONews`)
- BNO Desk (`@BNODesk`)
- OSINTdefender (`@sentdefender`)
- Faytuks (`@Faytuks`)
- OSINTtechnical (`@Osinttechnical`)
- TheIntelFrog (`@TheIntelFrog`)
- Associated Press (`@AP`)
- Reuters (`@Reuters`)
- BBC Breaking News (`@BBCBreaking`)

These feeds currently use public Nitter RSS. They do not use an X account,
password, exported cookies, browser session, OAuth grant, or API token.

### Official event feeds

- U.S. Geological Survey significant earthquakes
- National Weather Service high-impact alerts
- National Hurricane Center current storms with plausible U.S. impact
- NOAA Space Weather Prediction Center G3/R3/S3-or-higher alerts

Official feeds are fetched directly from the publishing agency and continue to
operate independently if the Nitter transport is unavailable.

## Relationship to the legacy UAP/social monitor

Agent K also contains an older, separate monitor controlled by
`NITTER_MONITOR_ENABLED` and `UAP_ALERT_CHANNEL_ID`. That legacy path has four
accounts hard-coded in `src/nitter.js` (UAP Gerb, American Alchemy, Missileman,
and Rob Jones), and every feed URL points directly to `https://nitter.net`.
It does not consume `EARTH_INTEL_NITTER_INSTANCES`, rotate mirrors, open
operational incidents, or fall back to official feeds.

Earth Intel is the resilient system described by this document. Its social
sources use the configured Nitter mirror pool, its transport has circuit
breaking and recovery notices, and its official agency adapters keep operating
during a complete Nitter outage. Enabling one monitor does not enable or
configure the other.

## Publication policy

A candidate must be both relevant and significant.

Relevant candidates normally have at least one of these properties:

- direct or likely impact on the United States or its territories;
- consequential U.S. military, diplomatic, economic, cyber, infrastructure,
  aviation, health, weather, disaster, or public-safety involvement;
- a foreign event with exceptional global-system consequences;
- an exceptional space or UAP development with clear public importance.

Routine foreign politics, ordinary crime, commentary, scheduled procedure,
incremental battlefield chatter, normal weather, human-interest follow-ups,
and posts whose only significance signal is the word "breaking" are
suppressed.

Official adapters apply additional hard gates:

- USGS: magnitude 5+ in a U.S. impact corridor, magnitude 7+ globally, or
  tsunami/orange/red significance.
- NWS: rare and high-impact hazards, emergency language, or
  Particularly Dangerous Situation products.
- NHC: tropical systems with a plausible U.S./territorial impact corridor,
  relevant watches or warnings, or sufficiently intense Atlantic/Central
  Pacific systems.
- NOAA Space Weather: G3, R3, or S3 and higher.

## Reliability model

Every public item is labeled:

- **Early Report**: a single credible discovery source, not independently
  confirmed.
- **Developing**: meaningful additional detail exists, but evidence remains
  incomplete or dependent.
- **Corroborated**: two or more independent source families report the same
  event.
- **Confirmed**: authoritative evidence confirms the underlying event.
- **Official Report / Official Claim**: the named authority made the statement;
  the label does not automatically endorse every contested assertion inside
  it.
- **Corrected** or **Disputed**: later evidence materially changes or challenges
  the prior account.

Accounts controlled by the same organization share a source family and cannot
independently corroborate each other. For example, BNO News and BNO Desk are
one family.

## Discord behavior

The operator chooses the destination channel with
`EARTH_INTEL_CHANNEL_ID`.

- Agent K is the only top-level publisher.
- Members can add reactions.
- Agent K creates one public discussion thread per story.
- Members can reply in those threads.
- Later evidence and reliability changes are routed to the existing thread.
- All payloads disable role and user mention parsing.
- Source URLs are embedded in the card title and fields where possible.
- A generated source registry is kept pinned.
- The first poll seeds the current source history without posting a backlog.

Required Agent K channel permissions:

- View Channel
- Send Messages
- Read Message History
- Embed Links
- Attach Files
- Create Public Threads
- Send Messages in Threads
- Manage Threads
- Manage Messages

`@everyone` should retain View Channel, Read Message History, Add Reactions, and
Send Messages in Threads while Send Messages and Create Public Threads remain
denied in the parent channel.

## Persistence and delivery safety

`data/earth-intel.sqlite` uses SQLite WAL mode and stores:

- source cursors, success times, failure counts, and retry deadlines;
- normalized candidates and their publication decision;
- clustered stories and independent evidence;
- Discord message and thread IDs;
- a persistent outbox for crash-safe retry;
- open and recovered operational incidents.

The delivery path records an outbox item before Discord publication and
reconciles ambiguous attempts after restart. This prevents a transient process
failure from silently losing a qualified event.

## Nitter fault handling

The Nitter transport is deliberately credential-free and accepts only HTTPS
base URLs without usernames or passwords. It:

- enforces request timeouts and response-size limits;
- manually validates redirects and destination hosts;
- verifies that a response is semantically valid RSS rather than an error page;
- tracks per-mirror failures and successes;
- applies exponential backoff and a circuit breaker;
- rotates to another configured healthy mirror;
- opens one persistent incident for a sustained outage;
- sends a recovery notice when service returns.

The default pool currently contains `https://nitter.net`. Additional mirrors
should be added only after a live semantic feed check; a long list of dead
mirrors makes recovery slower, not stronger.

If every Nitter mirror fails, official feeds continue polling. Agent K attempts
to DM the configured owner (or resolved guild owner) and falls back to the
private ops channel. It never asks for or falls back to an owner's personal X
credentials.

## Operations

- `npm run check`: syntax-checks Agent K and Agent J source files.
- `npm test`: runs the full automated suite.
- `npm run register`: registers the current guild-scoped Discord commands.
- `/earth-intel-health`: administrator-only live source, outbox, incident, and
  transport snapshot.

Monitoring pauses whenever the self-hosted Agent K process or its host is
offline, asleep, disconnected, or stopped. An always-on host can run the same
process with a persistent SQLite state volume.
