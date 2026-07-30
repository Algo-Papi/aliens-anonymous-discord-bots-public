import OpenAI from "openai";

import { citedMarkdownFromResponse } from "./citations.js";
import {
  buildResearchInstructions,
  buildResearchInput,
  normalizeResearchTier,
  researchPolicy,
} from "./prompt.js";

export class ResearchProviderError extends Error {
  constructor(code, message, cause) {
    super(message, { cause });
    this.name = "ResearchProviderError";
    this.code = code;
  }
}

function providerError(error) {
  const status = error?.status;
  const code = error?.code ?? error?.error?.code;
  if (status === 401 || code === "invalid_api_key") {
    return new ResearchProviderError(
      "INVALID_CREDENTIAL",
      "The Bureau research credential was rejected. A server administrator needs to refresh it.",
      error,
    );
  }
  if (code === "insufficient_quota") {
    return new ResearchProviderError(
      "INSUFFICIENT_QUOTA",
      "The OpenAI project has reached its dashboard spending or credit limit.",
      error,
    );
  }
  if (status === 429) {
    return new ResearchProviderError(
      "RATE_LIMIT",
      "The research provider is temporarily rate-limited. Try again shortly.",
      error,
    );
  }
  if (
    ["AbortError", "APIConnectionTimeoutError"].includes(error?.name) ||
    code === "ETIMEDOUT"
  ) {
    return new ResearchProviderError(
      "TIMEOUT",
      "The live research run exceeded the 90-second field window.",
      error,
    );
  }
  return new ResearchProviderError(
    "PROVIDER_FAILURE",
    "Live web research failed before Agent J could verify the evidence.",
    error,
  );
}

export class OpenAIResearchClient {
  constructor({
    apiKey,
    standardModel = "gpt-5.6-luna",
    deepModel = "gpt-5.6-terra",
    timeoutMs = 90_000,
    client,
  } = {}) {
    this.standardModel = standardModel;
    this.deepModel = deepModel;
    this.client =
      client ??
      new OpenAI({
        apiKey,
        timeout: timeoutMs,
        maxRetries: 1,
      });
  }

  async run({
    mode,
    scope,
    tier = "standard",
    question,
    transcript,
    safetyIdentifier,
  }) {
    const normalizedTier = normalizeResearchTier(tier);
    const policy = researchPolicy(normalizedTier);
    const model =
      normalizedTier === "deep" ? this.deepModel : this.standardModel;
    let response;
    try {
      response = await this.client.responses.create({
        model,
        instructions: buildResearchInstructions(normalizedTier),
        input: buildResearchInput({
          mode,
          scope,
          tier: normalizedTier,
          question,
          transcript,
        }),
        reasoning: { effort: policy.reasoningEffort },
        text: { verbosity: "low" },
        tools: [
          {
            type: "web_search",
            search_context_size: policy.searchContextSize,
          },
        ],
        tool_choice: "required",
        max_tool_calls: policy.maxToolCalls,
        include: ["web_search_call.action.sources"],
        max_output_tokens: policy.maxOutputTokens,
        safety_identifier: safetyIdentifier,
        store: false,
      });
    } catch (error) {
      throw providerError(error);
    }

    const rendered = citedMarkdownFromResponse(response);
    if (!rendered.hasRequiredEvidence) {
      throw new ResearchProviderError(
        "NO_WEB_EVIDENCE",
        "Agent J did not receive a usable live web search with clickable citations, so nothing can be published.",
      );
    }
    return {
      ...rendered,
      model,
      tier: normalizedTier,
      requestId: response._request_id ?? null,
      usage: response.usage ?? null,
    };
  }
}
