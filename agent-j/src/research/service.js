import { createHash } from "node:crypto";

import { assembleResearchContext, sanitizeText } from "./context.js";

function safetyIdentifier(guildId, userId) {
  return createHash("sha256")
    .update(`agent-j-research:v1:${guildId}:${userId}`)
    .digest("hex");
}

export class ResearchService {
  constructor({ config, userStore, provider, logger, now = Date.now }) {
    this.config = config;
    this.userStore = userStore;
    this.provider = provider;
    this.logger = logger;
    this.now = now;
  }

  async run({
    guildId,
    userId,
    anchorMessage,
    mode,
    scope,
    tier = "standard",
    question,
  }) {
    const startedAt = this.now();
    const context = await assembleResearchContext({
      anchorMessage,
      scope,
      limits: this.config.research,
      isOptedOut: (authorId) =>
        this.userStore.peekPrivacy(guildId, authorId).aiContextOptOut,
    });
    const result = await this.provider.run({
      mode,
      scope,
      tier,
      question: sanitizeText(question, () => "[member]"),
      transcript: context.transcript,
      safetyIdentifier: safetyIdentifier(guildId, userId),
    });
    const latencyMs = this.now() - startedAt;
    this.logger.info("research_completed", {
      guildId,
      channelId: anchorMessage.channelId,
      mode,
      scope,
      tier: result.tier,
      model: result.model,
      contextMessageCount: context.messageCount,
      contextCharacterCount: context.characterCount,
      omittedForPrivacy: context.omittedForPrivacy,
      sourceCount: result.sources.length,
      webSearchCalls: result.webSearchCalls,
      inputTokens: result.usage?.input_tokens ?? null,
      outputTokens: result.usage?.output_tokens ?? null,
      cachedInputTokens:
        result.usage?.input_tokens_details?.cached_tokens ??
        result.usage?.prompt_tokens_details?.cached_tokens ??
        null,
      cacheWriteInputTokens:
        result.usage?.input_tokens_details?.cache_write_tokens ??
        result.usage?.input_tokens_details?.cache_creation_tokens ??
        result.usage?.cache_creation_input_tokens ??
        null,
      reasoningTokens:
        result.usage?.output_tokens_details?.reasoning_tokens ?? null,
      latencyMs,
    });
    return {
      ...result,
      context: {
        messageCount: context.messageCount,
        omittedForPrivacy: context.omittedForPrivacy,
      },
      latencyMs,
    };
  }
}
