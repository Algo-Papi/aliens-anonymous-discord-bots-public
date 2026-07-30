# Privacy and data handling

This software is self-hosted. The server operator—not this repository—controls
the bot accounts, runtime databases, logs, Discord permissions, and optional
OpenAI project.

## Agent K data

Depending on enabled features, Agent K may store:

- guild, channel, message, user, and role IDs
- generated citation charges, findings, sentences, and jump links
- archive and alert delivery/deduplication metadata
- Earth Intel source/story state and operational incident state

Agent K does not need to persist ordinary conversation history.

## Agent J data

Agent J may store:

- member participation and privacy preferences
- Arena matches, rolls, records, balances, inventory, and transaction history
- cooldown, abandonment, and operational metadata

Its curated entertainment reports do not require an LLM and do not use message
content to personalize insults.

## Field Research

Field Research is optional, user-initiated, role-gated, channel-gated, and
disabled by default. When enabled:

- bounded recent Discord context is assembled in memory
- member identities are pseudonymized and common secrets/invites are redacted
- opted-out members' surrounding messages are omitted
- the selected question and bounded transcript are sent to OpenAI
- every completed brief requires live web search and citations
- previews are private until an analyst explicitly publishes them
- transcripts and generated briefs are not written to the local database/log

The provider request uses `store: false`, but that setting is not a promise of
zero provider retention. Operators should review current provider terms and
disclose the feature to community members before enabling it.

## Operator responsibilities

- Publish a user-facing explanation of stored data and research behavior.
- Grant the minimum Discord permissions.
- Keep runtime databases and backups outside Git, preferably encrypted.
- Establish a retention/deletion policy appropriate for the community.
- Do not attach unredacted logs, databases, or screenshots to public issues.
- Honor member opt-outs and applicable platform/privacy requirements.
