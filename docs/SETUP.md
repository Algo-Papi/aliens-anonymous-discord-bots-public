# Setup guide

This guide installs two separate, self-hosted Discord applications. Configure
and test one application at a time.

## 1. Prepare Discord

Enable **Developer Mode** under Discord's Advanced settings so you can copy
application, server, channel, role, user, and message IDs.

Create the roles and channels required by the features you plan to use. A
typical deployment has:

- Citation Officer role
- Agent J participation role
- optional protected and Research Analyst roles
- optional Bump Crew role
- archive channel
- social-alert channel
- Earth Intel channel and private operations channel
- Q&A channel and reaction-role message
- Arena channel and read-only Arena-records channel
- private testing channel

Discord IDs are identifiers, not credentials. This public repository leaves
them blank so one community's topology is never reused by another.

## 2. Create Agent K

In the [Discord Developer Portal](https://discord.com/developers/applications):

1. Create an application and add a bot user.
2. Copy the **Application ID** into `DISCORD_CLIENT_ID`.
3. Copy the target server ID into `DISCORD_GUILD_ID`.
4. Under **Bot**, enable the privileged **Message Content Intent**.
5. Under **Installation**, enable Guild Install with the `bot` and
   `applications.commands` scopes.
6. Install the application into the server using an account with Manage Server.

Agent K uses these gateway intents:

- Guilds
- Guild Messages
- Guild Message Reactions
- Message Content

Recommended baseline channel permissions:

- View Channel
- Send Messages
- Read Message History
- Embed Links
- Attach Files
- Use Application Commands

Optional features may also need:

- **Reaction roles:** Manage Roles; Agent K's integration role must sit above
  every role it assigns. Configure `Q_AND_A_CHANNEL_ID`,
  `FIELD_CLEARANCE_ROLE_ID`, and `FIELD_CLEARANCE_MESSAGE_ID` together; setting
  only part of that trio makes startup fail closed.
- **Bump Crew:** Manage Roles; Agent K's integration role must sit above the
  Bump Crew role. Because reminder messages intentionally ping that one role,
  mark the Bump Crew role as mentionable.
- **Replacing duplicate alert posts:** Manage Messages only in the alert
  channel.
- **Earth Intel discussions:** Create Public Threads, Send Messages in Threads,
  Manage Threads, and Manage Messages in the Earth Intel channel.

Do not grant Administrator merely for convenience. Keep the broad **Mention
@everyone, @here, and All Roles** permission denied. Making only the Bump Crew
role mentionable allows its intended reminder ping without granting Agent K
permission to ping every role.

## 3. Create Agent J

Create a second Discord application and bot user:

1. Copy its Application ID into `AGENT_J_CLIENT_ID`.
2. Copy the same server ID into `AGENT_J_GUILD_ID`.
3. Install it with the `bot` and `applications.commands` scopes.
4. Grant only View Channel, Send Messages, Read Message History, Embed Links,
   and Use Application Commands in its allowed channels. Also grant Send
   Messages in Threads when an allowed research location can be a thread or
   forum post.

Agent J normally uses Guilds and Guild Messages. Enable Discord's privileged
Message Content Intent only when Field Research will be enabled.

Agent J should not receive Manage Messages, Manage Roles, timeout, kick, ban, or
Administrator permissions.

Configure at least one participation role in `AGENT_J_ACCESS_ROLE_IDS` before
testing entertainment or Arena features. Authorization fails closed when the
list is empty. Both the person invoking a report/challenge and its target must
hold one of the configured roles; server administrators receive no runtime
bypass. The independent Field Research feature uses
`AGENT_J_RESEARCH_ROLE_IDS` instead.

## 4. Install dependencies

```powershell
git clone https://github.com/Algo-Papi/aliens-anonymous-discord-bots-public.git
Set-Location .\aliens-anonymous-discord-bots-public

npm ci
Push-Location .\agent-j
npm ci
Pop-Location
```

Copy the public templates:

```powershell
Copy-Item .env.example .env
Copy-Item .\agent-j\.env.example .\agent-j\.env
```

Fill the required application and guild IDs. Add optional role/channel/message
IDs only for features you intend to enable. See
[CONFIGURATION.md](CONFIGURATION.md).

## 5. Store credentials

### Windows Credential Manager

Copy only the relevant credential to the clipboard, then run:

```powershell
# Agent K token, from repository root
powershell -NoProfile -STA -ExecutionPolicy Bypass `
  -File .\scripts\Set-DiscordTokenFromClipboard.ps1

# Agent J token
Push-Location .\agent-j
powershell -NoProfile -STA -ExecutionPolicy Bypass `
  -File .\scripts\Set-DiscordTokenFromClipboard.ps1

# Optional Agent J OpenAI project key
powershell -NoProfile -STA -ExecutionPolicy Bypass `
  -File .\scripts\Set-OpenAIKeyFromClipboard.ps1
Pop-Location
```

The setter scripts write to the current Windows user's Credential Manager and
clear the clipboard.

### Other platforms

Inject credentials into the bot process using a service supervisor, container
secret, or cloud secret manager:

- Agent K: `DISCORD_TOKEN`
- Agent J: `AGENT_J_DISCORD_TOKEN`
- optional research: `AGENT_J_OPENAI_API_KEY`

For a one-time interactive shell:

```bash
read -rsp "Agent K Discord token: " DISCORD_TOKEN
export DISCORD_TOKEN
echo
npm start
unset DISCORD_TOKEN
```

Do not persist tokens in shell profiles or commit them to `.env`.

## 6. Verify and register commands

Run all checks before making Discord changes:

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

Register each application's guild-scoped commands separately:

```powershell
# Agent K
npm run register

# Agent J
Push-Location .\agent-j
npm run register
Pop-Location
```

Registration requires the matching application ID, guild ID, and token.
Reregister after command definitions or Discord command permissions change;
ordinary content-pool edits need only a process restart.

The two registration scripts have intentionally different cleanup behavior:

- Agent J replaces its complete guild-command collection, so commands removed
  from its definitions are also removed from Discord.
- Agent K creates or updates the commands it currently defines one at a time.
  It does **not** delete an obsolete Agent K command left from an older build;
  remove such a command explicitly in the Developer Portal or with Discord's
  application-command API.

## 7. Smoke test

Use a designated private testing channel before broader rollout:

1. Start Agent K with `npm start`.
2. Verify one citation, one record lookup, and any enabled archive/reaction-role
   behavior.
3. Start Agent J from `agent-j/` with `npm start`.
4. Verify report authorization, the privacy opt-out, one Arena challenge, and
   Arena-record delivery.
5. Keep Field Research disabled until its separate activation checklist in
   [AGENT_J_RESEARCH.md](AGENT_J_RESEARCH.md) is complete.
6. Delete test messages and review logs for errors.

For completed Arena cards to disappear from the live Arena channel,
`AGENT_J_ARENA_RESULTS_CHANNEL_ID` must identify a writable records channel.
The deletion countdown is queued only after Agent J successfully copies the
completed result there; if the records channel is missing or unavailable,
Agent J retains the live card and retries archival.

Both applications are local services. They stop responding when the host
sleeps, shuts down, loses connectivity, or terminates the process. See
[OPERATIONS.md](OPERATIONS.md) for persistent hosting options.
