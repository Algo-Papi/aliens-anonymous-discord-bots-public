# Agent J

Agent J is the member-facing entertainment, Arena, economy, privacy, and
optional research application in the M.I.B. Discord Bot Suite.

It is intentionally isolated from Agent K:

- separate Discord application and token
- separate Node process and command registration
- separate SQLite database and logs
- no moderation permissions
- no access to Agent K citation history

## Entertainment commands

Message/member context commands:

- **Scan Subject**
- **Memory Audit**
- **Assess Threat**
- **Challenge in Blacksite Arena**

Slash commands include:

- `/agent-j privacy`
- `/arena rules`
- `/arena shop`
- `/arena inventory`
- `/arena profile [member]`

The curated report engine uses structured content pools rather than runtime LLM
generation. Reports support role access, targeting opt-outs, protected roles,
cooldowns, anti-dogpiling limits, recent-channel witness selection, and
mention-safe public output.

Access is fail-closed: an empty `AGENT_J_ACCESS_ROLE_IDS` authorizes nobody.
Both the invoker and target need a configured participation role, including
server administrators. There is no Administrator bypass.

## Blacksite Arena

Arena is a best-of-three, mostly luck-based challenge:

- both players must consent
- each round privately selects Blast, Shield, or Dirty Trick
- the winning tactic receives a transparent bonus
- cryptographically secure d100 rolls remain the main outcome driver
- equipment, rewards, inventory, and records are transactional
- pair limits and daily caps reduce farming
- interrupted matches recover safely after restart

Completed results are copied to a read-only records channel. Only after that
copy succeeds does Agent J queue the live Arena card for deletion after the
configured delay. Leaving `AGENT_J_ARENA_RESULTS_CHANNEL_ID` empty, or making
that channel unwritable, therefore leaves completed cards in the live channel
while archival is retried.

## Field Research

Field Research is optional and disabled by default. It is independently:

- role-gated
- channel-gated
- user-initiated
- bounded to Focused or Standard Discord context
- pseudonymized and secret-redacted
- required to use live web search and clickable citations
- previewed privately before explicit publication

Standard and Deep tiers are configurable. Only research calls OpenAI; ordinary
reports and Arena gameplay do not.

Read [the research guide](../docs/AGENT_J_RESEARCH.md) and
[privacy guide](../docs/PRIVACY.md) before enabling it.

## Setup

From the repository root:

```powershell
Push-Location .\agent-j
npm ci
Copy-Item .env.example .env
Pop-Location
```

At minimum, configure:

```dotenv
AGENT_J_CLIENT_ID=
AGENT_J_GUILD_ID=
AGENT_J_ACCESS_ROLE_IDS=
AGENT_J_ARENA_CHANNEL_ID=
AGENT_J_ARENA_RESULTS_CHANNEL_ID=
```

`AGENT_J_TEST_CHANNEL_ID` is optional and is used only as the default
destination for `scripts/research-test-anchor.js`; Agent J does not require it
to start or serve commands.

If Field Research will be used in threads or forum posts, grant Agent J **Send
Messages in Threads** in addition to its baseline channel permissions.

On Windows, store the bot token:

```powershell
Push-Location .\agent-j
powershell -NoProfile -STA -ExecutionPolicy Bypass `
  -File .\scripts\Set-DiscordTokenFromClipboard.ps1
Pop-Location
```

On other platforms, securely inject `AGENT_J_DISCORD_TOKEN` into the process.

Then validate and register:

```powershell
Push-Location .\agent-j
npm run check
npm test
npm run simulate:arena
npm run simulate:economy
npm run register
npm start
```

See the repository [setup guide](../docs/SETUP.md) and
[configuration reference](../docs/CONFIGURATION.md) for Developer Portal
intents, permissions, credential storage, and optional research configuration.

## Runtime data

Agent J stores state outside the source tree by default:

- Windows: `%LOCALAPPDATA%\AliensAnonymous\AgentJ`
- Linux/macOS: `~/.local/share/AliensAnonymous/AgentJ`

Override with `AGENT_J_DATA_DIR`. The directory contains the SQLite database
and logs and may include Discord IDs and member gameplay/privacy metadata. Do
not commit or upload it.

## Profile artwork

This public repository ships without third-party artwork. Set local
`AGENT_J_AVATAR_PATH` and/or `AGENT_J_BANNER_PATH`, then run:

```powershell
npm run update-profile
```

Use only original or properly licensed artwork.
