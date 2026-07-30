# Agent J M.I.B. Field Research

Status: **optional and disabled by default**

## Member experience

Access requires the manually assigned **M.I.B Desk Analyst** role. It is
separate from the self-service **M.I.B. Field Clearance** role.

The message context command is part of Agent J's registered command set even
while research is disabled, so members may still see it under **Apps**.
With `AGENT_J_RESEARCH_ENABLED=false`, Agent J rejects its use ephemerally
before any OpenAI request.

1. Right-click a message.
2. Choose **Apps → M.I.B. Field Research**.
3. Choose a mode:
   - **Fact-check selected claim**
   - **Ground this discussion**
   - **Research a question**
4. Choose a research tier:
   - **Standard Research (default):** GPT-5.6 Luna, optimized for routine
     fact-checking and discussion grounding.
   - **Deep Research:** GPT-5.6 Terra, reserved for questions that justify a
     broader and more expensive investigation.
5. Choose a Discord context scope:
   - **Focused:** selected message, reply ancestry, and closely related
     messages; at most 10 messages and 6,000 characters.
   - **Standard:** nearby relevant messages; at most 25 messages and 12,000
     characters. Standard is the maximum scope.
6. Optionally enter a focus question. A question is required in Research mode.
7. Agent J runs a live web search and returns an ephemeral preview.
8. The Desk Analyst may publish that exact brief as a reply to the selected
   message, discard it, or request a new paid run after the cooldown.

Publishing does not issue a second OpenAI request. Public briefs suppress all
Discord mentions. **Research tier** controls the model and investigation
budget; **context scope** controls how much Discord conversation may be sent.
For example, Standard Research may be run with either Focused or Standard
context. The two uses of “Standard” do not imply each other.

## Authorization and operational controls

- Runtime authorization checks `AGENT_J_RESEARCH_ROLE_IDS` every time a setup,
  modal, rerun, or publish control is used.
- Research is permitted only in `AGENT_J_RESEARCH_CHANNEL_IDS`. An empty
  allowlist fails closed.
- If an allowlisted location is a thread or forum post, Agent J also needs
  **Send Messages in Threads** there so it can publish the approved brief as a
  reply.
- One research job may run per user.
- At most two jobs may run for the server at once.
- A completed request starts a 60-second user cooldown.
- Provider/network failures release the reservation without starting the
  cooldown.
- A request times out after 90 seconds. The OpenAI SDK may retry a transient
  failure once.
- There is no local daily, monthly, or dollar cutoff. The OpenAI project
  dashboard is the spending boundary.
- A missing, invalid, exhausted, or rate-limited credential affects research
  only. Entertainment and Arena features continue running.

## Research tiers, token efficiency, and live search

- API: OpenAI Responses API
- Web tool: `web_search`
- Tool choice: `required`
- Included evidence metadata:
  `web_search_call.action.sources`
- Response storage: `store: false`
- Background mode: disabled

**Standard Research** is the default:

- Model: explicit `gpt-5.6-luna`
- At most 2 web-search/tool calls in one Responses API request
- At most 1,000 output tokens
- Low reasoning effort and low search context

**Deep Research** is an explicit optional tier:

- Model: explicit `gpt-5.6-terra`
- At most 5 web-search/tool calls in one Responses API request
- At most 1,800 output tokens
- Medium reasoning effort and medium search context

Both tiers require at least one successful live web search. A single research
run is normally one Responses API request, but that request may contain
multiple separately billable web-search tool calls up to the tier limit.
Choosing **Run Again** creates another paid request. Choosing **Publish Brief**
does not.

The default tier reduces token use through the smaller Luna model, low
reasoning/search context, a two-search ceiling, and a 1,000-token answer cap.
The Discord context limits are a separate input-control layer: Focused allows
up to 10 messages / 6,000 characters, while Standard allows up to 25 messages /
12,000 characters. Members should prefer Focused unless the surrounding
conversation is necessary.

Agent J refuses to publish an answer unless the response contains a completed
web search, output text, and verified URL citation metadata. Raw links generated
outside the citation metadata are removed. Citations and a Sources section are
rendered as clickable Discord links.

Official references:

- [GPT-5.6 Luna](https://developers.openai.com/api/docs/models/gpt-5.6-luna)
- [GPT-5.6 Terra](https://developers.openai.com/api/docs/models/gpt-5.6-terra)
- [OpenAI web search](https://developers.openai.com/api/docs/guides/tools-web-search)
- [OpenAI API data controls](https://platform.openai.com/docs/models/default-usage-policies-by-endpoint)

## Discord context and privacy

Enabling research adds the privileged Discord **Message Content** gateway
intent. It is used only for a user-initiated research run in an allowlisted
channel.

Before context leaves the PC:

- the selected message is always the anchor;
- only the same channel or thread is considered;
- ordinary surrounding bot, webhook, system, and join messages are excluded;
- a selected bot alert may contribute its text and safe embed
  title/description/URL;
- attachments, images, audio, and Discord CDN files are excluded;
- member names, user IDs, mentions, channel mentions, and role mentions are
  pseudonymized;
- common API keys, bearer tokens, Discord-like tokens, email addresses, phone
  numbers, and invite links are redacted;
- every transcript and web page is labeled untrusted evidence, never
  instructions.

`/agent-j privacy` includes an **AI research context** toggle. An opted-out
member's surrounding messages are omitted. If the selected message's author
has opted out, the research run is denied before an API request.

The assembled transcript, analyst question, and private preview exist only in
memory and expire after 15 minutes. They are not written to SQLite or logs.
The published Discord reply persists under normal Discord retention.

The OpenAI request uses `store: false`; OpenAI states API data is not used to
train models by default. This is not a promise of zero provider retention:
standard abuse-monitoring logs may be retained according to the account's
applicable data-control policy.

## Logging

Research logs contain operational metadata only:

- guild and channel
- mode, research tier, and context scope
- model
- context message/character counts
- privacy omission count
- source/search-call counts
- token usage
- latency
- success/failure code and published message ID

Never log the Discord transcript, research question, generated brief, source
snippets, member names, or credentials.

## Secure credential

Windows deployments can store a dedicated OpenAI project API key in Credential
Manager under:

```text
MIB Discord Bot Suite - Agent J OpenAI Key
```

Copy the dedicated project key to the clipboard, then run from `agent-j`:

```powershell
powershell -NoProfile -STA -ExecutionPolicy Bypass `
  -File .\scripts\Set-OpenAIKeyFromClipboard.ps1
```

The script validates the key prefix, stores it, and clears the clipboard. Do
not paste the key into Discord, chat, Git, `.env`, documentation, or logs.

## Activation checklist

For a fresh deployment, do not set `AGENT_J_RESEARCH_ENABLED=true` until every
item is complete:

1. Create a **M.I.B Desk Analyst** Discord role with no administrative
   permissions and assign it to one consenting tester.
2. Add its ID to `AGENT_J_RESEARCH_ROLE_IDS`.
3. Add an operator-designated testing channel ID to
   `AGENT_J_RESEARCH_CHANNEL_IDS`.
4. Store the dedicated OpenAI project key with the clipboard script.
5. Enable **Message Content Intent** for the Agent J application in the
   Discord Developer Portal.
6. Run `npm run diagnostics`, `npm run check`, and `npm test`.
7. Set `AGENT_J_RESEARCH_ENABLED=true`.
8. Restart the Agent J process or service. The research command was already
   included by normal Agent J registration; toggling the feature flag does not
   require another registration run.
9. Test in the designated channel, verify citations and the opt-out path, then
    update the server's user-facing guide.

If Message Content Intent is not enabled before the feature flag is turned on,
Discord may reject the gateway connection. Keeping the flag false avoids that
risk while the rest of Agent J remains live.
