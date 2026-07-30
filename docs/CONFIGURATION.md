# Configuration reference

Copy `.env.example` to `.env` and `agent-j/.env.example` to `agent-j/.env`.
Blank optional IDs disable or leave the related integration unconfigured.

Tokens and API keys are sensitive. Discord snowflakes are not authentication
credentials, but operators may still consider their server topology private.

## Agent K

| Variable | Purpose | Default / requirement |
| --- | --- | --- |
| `DISCORD_CLIENT_ID` | Agent K application ID | Required |
| `DISCORD_GUILD_ID` | Guild receiving commands | Required |
| `DISCORD_TOKEN` | Bot token for non-Windows injection | Secret; Credential Manager is preferred on Windows |
| `CITATION_ROLE_IDS` | Comma-separated extra citation roles | Empty; Manage Messages/Admin remain allowed |
| `CITATION_COOLDOWN_SECONDS` | Per-moderator citation cooldown | `15` |
| `CHAT_RESPONSE_COOLDOWN_SECONDS` | Passive-response cooldown | `5` |
| `ORB_REFERENCE_URL` | Link used in the dramatic orb response pool | `https://example.com/orb-archive`; customize it |
| `ARCHIVE_ENABLED` | Enable star archiving | `false` |
| `ARCHIVE_CHANNEL_ID` | Archive destination | Required when archive is enabled |
| `NITTER_MONITOR_ENABLED` | Enable the legacy four-account UAP/social monitor | `false`; source accounts and `nitter.net` feed URLs are defined in `src/nitter.js` |
| `UAP_ALERT_CHANNEL_ID` | Legacy UAP/social-alert destination | Required when the legacy monitor is enabled |
| `READYBOT_USER_ID` | Optional duplicate-alert bot account | Empty |
| `NITTER_POLL_INTERVAL_SECONDS` | Social polling cadence | `600` |
| `NITTER_MAX_ITEMS_PER_POLL` | Per-source delivery ceiling | `3` |
| `CITATION_DB_PATH` | Citation SQLite override | `data/citations.sqlite` |
| `AUTOMATION_DB_PATH` | Archive/alert state override | `data/automation.sqlite` |
| `EARTH_INTEL_ENABLED` | Enable breaking-news monitor | `false` |
| `EARTH_INTEL_CHANNEL_ID` | Earth Intel destination | Required when enabled |
| `EARTH_INTEL_OPS_CHANNEL_ID` | Private health/failure fallback | Optional but recommended |
| `EARTH_INTEL_OWNER_USER_ID` | Optional owner DM target | Guild owner when omitted |
| `EARTH_INTEL_SCHEDULER_INTERVAL_SECONDS` | Scheduler cadence | `60` |
| `EARTH_INTEL_DAILY_SOFT_CAP` | Ordinary-card daily target | `6` |
| `EARTH_INTEL_MAX_ITEMS_PER_SOURCE_PER_CYCLE` | Intake ceiling | `5` |
| `EARTH_INTEL_NITTER_INSTANCES` | Credential-free HTTPS mirrors | `https://nitter.net` |
| `EARTH_INTEL_DB_PATH` | Earth Intel SQLite override | `data/earth-intel.sqlite` |
| `Q_AND_A_CHANNEL_ID` | Reaction-role channel | Empty; configure with both Field Clearance IDs or leave all three empty |
| `FIELD_CLEARANCE_ROLE_ID` | Role added/removed by reaction | Empty; configure with channel and message IDs |
| `FIELD_CLEARANCE_MESSAGE_ID` | Exact role-request message | Empty; configure with channel and role IDs |
| `FIELD_CLEARANCE_EMOJI` | Exact role-request emoji | `🕶️` |
| `BUMP_REMINDER_ENABLED` | Enable manual bump reminders | `false` |
| `BUMP_REMINDER_CHANNEL_ID` | Reminder destination | Required when enabled |
| `BUMP_CREW_ROLE_ID` | Opt-in reminder role | Required when enabled |
| `DISBOARD_USER_ID` | DISBOARD account ID | Required for bump acknowledgement |
| `BUMP_REMINDER_TIME_ZONE` | IANA timezone | `America/New_York` |
| `BUMP_REMINDER_TIMES` | Comma-separated local times | Example schedule in `.env.example` |
| `BUMP_REMINDER_GRACE_MINUTES` | Due-slot tolerance | `10` |
| `BUMP_REMINDER_SCHEDULER_INTERVAL_SECONDS` | Reminder check cadence | `30` |
| `DISBOARD_BUMP_COOLDOWN_SECONDS` | Buffered bump cooldown | `7380` |

## Agent J

| Variable | Purpose | Default / requirement |
| --- | --- | --- |
| `AGENT_J_CLIENT_ID` | Agent J application ID | Required |
| `AGENT_J_GUILD_ID` | Guild receiving commands | Required |
| `AGENT_J_DISCORD_TOKEN` | Bot token for non-Windows injection | Secret |
| `AGENT_J_ACCESS_ROLE_IDS` | Comma-separated participation roles | Empty fails closed; both invoker and target need a listed role, with no Administrator bypass |
| `AGENT_J_PROTECTED_ROLE_IDS` | Roles protected from targeting | Empty |
| `AGENT_J_ARENA_CHANNEL_ID` | Allowed Arena channel | Empty |
| `AGENT_J_ARENA_RESULTS_CHANNEL_ID` | Durable Arena-record channel | Empty disables archival and therefore completed-card cleanup |
| `AGENT_J_ARENA_CLEANUP_SECONDS` | Live-result deletion delay after successful records-channel archival | `300`, maximum `3600` |
| `AGENT_J_TEST_CHANNEL_ID` | Default channel for the optional `scripts/research-test-anchor.js` utility | Empty; not required by the runtime |
| `AGENT_J_ALLOW_OPTED_OUT_INVOKERS` | Let opted-out users invoke reports | `false` |
| `AGENT_J_RESEARCH_ENABLED` | Enable OpenAI-backed research | `false` |
| `AGENT_J_RESEARCH_ROLE_IDS` | Analyst roles | Empty |
| `AGENT_J_RESEARCH_CHANNEL_IDS` | Allowed research channels | Empty |
| `AGENT_J_RESEARCH_STANDARD_MODEL` | Standard model ID | `gpt-5.6-luna` |
| `AGENT_J_RESEARCH_DEEP_MODEL` | Deep model ID | `gpt-5.6-terra` |
| `AGENT_J_RESEARCH_TIMEOUT_SECONDS` | Provider timeout | `90`, maximum `120` |
| `AGENT_J_RESEARCH_FOCUSED_MESSAGE_LIMIT` | Focused context messages | `10`, hard maximum `10` |
| `AGENT_J_RESEARCH_STANDARD_MESSAGE_LIMIT` | Standard context messages | `25`, hard maximum `25` |
| `AGENT_J_RESEARCH_FOCUSED_CHARACTER_LIMIT` | Focused context characters | `6000` |
| `AGENT_J_RESEARCH_STANDARD_CHARACTER_LIMIT` | Standard context characters | `12000` |
| `AGENT_J_OPENAI_API_KEY` | Research key for non-Windows injection | Secret |
| `AGENT_J_DATA_DIR` | Database/log directory override | Platform data directory |
| `AGENT_J_AVATAR_PATH` | Local profile-avatar path | Optional |
| `AGENT_J_BANNER_PATH` | Local profile-banner path | Optional |

Model availability and pricing depend on the operator's OpenAI project. Replace
the example model IDs with models available to that project when necessary.

Field Research is optional and disabled by default. Its message context command
is still registered and may remain visible in Discord while
`AGENT_J_RESEARCH_ENABLED=false`; attempting to use it is rejected ephemerally
at runtime without making an OpenAI request.

## Finding Discord IDs

With Developer Mode enabled:

- Right-click a server and choose **Copy Server ID**.
- Right-click a channel or role and choose **Copy ID**.
- For a message ID, right-click the exact message and choose **Copy Message
  ID**.
- Application IDs are shown in the Developer Portal under General Information.

Keep comma-separated ID lists free of spaces unless a parser explicitly trims
them. Restart the corresponding bot after changing runtime configuration.
