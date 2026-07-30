# Operations guide

Agent K and Agent J are independent local services. Restart, recover, and
troubleshoot them separately.

## Routine validation

From the repository root:

```powershell
npm ci
npm run check
npm test
```

For Agent J:

```powershell
Push-Location .\agent-j
npm ci
npm run check
npm test
npm run diagnostics
npm run simulate:arena
npm run simulate:economy
Pop-Location
```

Run `npm run register` inside only the application whose Discord command
definitions changed. Curated responses, citation pools, and Arena narration
normally need only a process restart.

Agent J registration replaces its entire guild-command collection. Agent K
registration only creates or updates the commands currently defined and does
not delete obsolete Agent K commands. Remove a retired Agent K command
explicitly through the Developer Portal or Discord application-command API.

## Interactive operation

Run each bot in a separate terminal:

```powershell
# Agent K
npm start
```

```powershell
# Agent J
Set-Location .\agent-j
npm start
```

Stop cleanly with `Ctrl+C` so SQLite connections and timers can close.

## Windows Scheduled Tasks

After credentials and `.env` files are configured:

```powershell
# Agent K
powershell -NoProfile -ExecutionPolicy Bypass `
  -File .\scripts\Install-StartupTask.ps1

# Agent J
powershell -NoProfile -ExecutionPolicy Bypass `
  -File .\agent-j\scripts\Install-StartupTask.ps1
```

The optional `-TaskName` parameter changes the generic default name. Inspect
the resulting task action, working directory, user, and restart settings before
relying on it.

Example controls using the defaults:

```powershell
Start-ScheduledTask -TaskName "MIB Discord Bot Suite - Agent K"
Stop-ScheduledTask -TaskName "MIB Discord Bot Suite - Agent K"

Start-ScheduledTask -TaskName "MIB Discord Bot Suite - Agent J"
Stop-ScheduledTask -TaskName "MIB Discord Bot Suite - Agent J"
```

The bots are unavailable while the host is asleep, shut down, offline, or not
logged into the interactive account used by these task definitions.

## Linux, containers, and hosted services

Use a service supervisor such as systemd, a container orchestrator, or a
platform process manager. Inject credentials through that platform's secret
mechanism and use separate services for Agent K and Agent J.

Configure:

- automatic restart with a bounded backoff
- a stable working directory
- graceful `SIGTERM`
- persistent runtime-state volumes
- log rotation
- health/error notification

Do not bake credentials or `.env` files into container images.

## Runtime state and backups

Default Agent K state:

- `data/citations.sqlite`
- `data/automation.sqlite`
- `data/earth-intel.sqlite`
- `logs/citation-bureau.log`

Agent J defaults to:

- Windows: `%LOCALAPPDATA%\AliensAnonymous\AgentJ`
- Linux/macOS: `~/.local/share/AliensAnonymous/AgentJ`

Stop the corresponding process before taking a simple file-copy backup. SQLite
may also create `-wal` and `-shm` companions. Back up the complete consistent
set, store it outside the source checkout, and encrypt backups that contain
member or server metadata.

Never commit runtime state.

## Recovery order

1. Clone the public repository.
2. Install dependencies in both packages.
3. Restore `.env` configuration from a secure operator backup or recreate it.
4. Restore credentials through Credential Manager or the host's secret
   mechanism.
5. Optionally restore databases while both bots are stopped.
6. Run syntax checks, tests, and Agent J diagnostics.
7. Register commands if the Discord applications are new.
8. Start one bot at a time and inspect logs.

## Troubleshooting

- **Invalid token / login failure:** rotate or reinstall only that
  application's Discord token.
- **Unknown interaction or missing Apps command:** verify application/guild IDs
  and rerun registration for the matching application.
- **Missing role behavior:** verify IDs, bot role ordering, and Manage Roles
  where assignment is enabled.
- **No research context:** confirm the feature flag, analyst role, allowed
  channel, OpenAI credential, Message Content Intent, and Send Messages in
  Threads when the request is in a thread or forum post.
- **No Earth Intel threads:** verify channel thread permissions.
- **Completed Arena card never cleans up:** verify the results-channel ID and
  Agent J's ability to post there. Cleanup is queued only after archival
  succeeds.
- **Database locked/corrupt:** stop duplicate processes before attempting
  repair or restore.

Do not solve permission problems by granting Administrator.
