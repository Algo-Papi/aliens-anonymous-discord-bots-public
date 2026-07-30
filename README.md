# M.I.B. Discord Bot Suite

A self-hosted, two-application Discord toolkit for community moderation,
organization, entertainment, lightweight games, social alerts, and optional
web-grounded research.

This repository is a sanitized public mirror of a real community-bot project.
It contains no live server IDs, member IDs, credentials, runtime databases,
logs, or third-party profile artwork. It provides source code—not a hosted bot.

> **Content warning:** Some citation and entertainment pools contain mature,
> abrasive, or deliberately ridiculous satire. Review `src/offenses.js`,
> `src/responses.js`, and `agent-j/src/content/` before using them in your
> community.

## Applications

| Application | Location | Main responsibilities |
| --- | --- | --- |
| **Agent K** | Repository root | Message-context citations and public records, star archiving, reaction roles, DISBOARD reminders, social alerts, and Earth Intel |
| **Agent J** | `agent-j/` | Member-facing fictional reports, privacy controls, Blacksite Arena and economy, and optional OpenAI-backed research |

The applications intentionally use separate Discord applications, tokens,
processes, databases, permissions, and command registrations. Agent J never
receives Agent K's citation history or token.

Agent J's entertainment and Arena features do not require OpenAI. Only the
optional Field Research feature makes OpenAI API calls.

## Requirements

- Node.js 20 or newer
- Two Discord applications and bot users
- A Discord server where you can install applications and configure roles
- Windows PowerShell for the bundled Credential Manager/startup helpers, or a
  secure environment/service-secret mechanism on another platform
- An OpenAI API key only if Agent J Field Research is enabled

## Quick start

```powershell
git clone https://github.com/Algo-Papi/aliens-anonymous-discord-bots-public.git
Set-Location .\aliens-anonymous-discord-bots-public

npm ci
Push-Location .\agent-j
npm ci
Pop-Location

Copy-Item .env.example .env
Copy-Item .\agent-j\.env.example .\agent-j\.env
```

Fill the blank application, guild, channel, role, and message IDs in the two
`.env` files. Keep optional modules disabled until their required Discord
objects exist.

Continue with the complete [setup guide](docs/SETUP.md) and
[configuration reference](docs/CONFIGURATION.md).

## Verify before connecting to Discord

```powershell
npm run check
npm test

Push-Location .\agent-j
npm run check
npm test
npm run simulate:arena
npm run simulate:economy
Pop-Location
```

Register the guild-scoped application commands only after configuration and
credentials are ready:

```powershell
npm run register

Push-Location .\agent-j
npm run register
Pop-Location
```

Start each application in its own terminal:

```powershell
npm start
```

```powershell
Set-Location .\agent-j
npm start
```

## Feature overview

### Agent K

- Right-click a message to issue a randomized theatrical citation.
- Right-click a message or member to publish citation history.
- Copy starred messages into a structured archive channel.
- Grant or remove a configured opt-in role from one reaction.
- Send mention-safe manual DISBOARD reminders.
- Run the optional legacy UAP/social monitor for its four source accounts and
  post embedded alerts.
- Run a low-volume, US-first Earth Intel feed with reliability labels,
  clustering, source-family corroboration, discussion threads, and operational
  health notices.

Agent K's citations are theatrical and do not mute, timeout, kick, or ban.

### Agent J

- `Scan Subject`, `Memory Audit`, and `Assess Threat` context commands.
- Blacksite Arena challenges with hidden tactics, transparent rolls, records,
  Blacksite Credits, equipment, and anti-farming controls.
- User privacy/targeting controls.
- Optional, disabled-by-default, role- and channel-gated research with bounded
  Discord context, live web search, citations, private preview, and explicit
  publishing.

Agent J fails closed when no participation role is configured. Both the
invoker and the target must hold a role listed in
`AGENT_J_ACCESS_ROLE_IDS`; Administrator does not bypass that runtime check.

Read [Agent J's guide](agent-j/README.md), the
[research guide](docs/AGENT_J_RESEARCH.md), and the
[design specification](docs/AGENT_J_PRODUCT_SPEC.md).

## Runtime data

Agent K stores ignored SQLite state under `data/` and logs under `logs/`.
Agent J stores its SQLite database and logs in a platform data directory or
`AGENT_J_DATA_DIR`. These files may contain Discord identifiers and operational
metadata. Do not commit, upload, or attach them to public issues.

See [privacy](docs/PRIVACY.md), [operations](docs/OPERATIONS.md), and
[security](SECURITY.md).

## Repository layout

```text
.
├── src/                    Agent K runtime
├── test/                   Agent K tests
├── scripts/                Agent K setup/credential helpers
├── agent-j/                Isolated Agent J package
├── docs/                   Setup, design, operations, and privacy guides
├── assets/README.md        Bring-your-own-artwork instructions
├── .env.example            Public-safe Agent K configuration template
└── SECURITY.md
```

Both `package.json` files retain `"private": true` to prevent accidental npm
publication. That setting is unrelated to GitHub repository visibility.

## Contributing and license

Contributions are welcome; read [CONTRIBUTING.md](CONTRIBUTING.md) first.
The code is available under the [MIT License](LICENSE). See [NOTICE.md](NOTICE.md)
for the unofficial-project and third-party-name disclaimer.
