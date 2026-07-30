import assert from "node:assert/strict";
import test from "node:test";

import {
  OpenAIResearchClient,
  ResearchProviderError,
} from "../../src/research/openai-client.js";

function citedResponse(usage = { input_tokens: 100, output_tokens: 50 }) {
  return {
    _request_id: "req_test",
    usage,
    output: [
      {
        type: "web_search_call",
        status: "completed",
        action: {
          sources: [
            { url: "https://example.com", title: "Example" },
          ],
        },
      },
      {
        type: "message",
        content: [
          {
            type: "output_text",
            text: "Verified [1]",
            annotations: [
              {
                type: "url_citation",
                start_index: 9,
                end_index: 12,
                url: "https://example.com",
                title: "Example",
              },
            ],
          },
        ],
      },
    ],
  };
}

test("standard research uses Luna with strict cost controls", async () => {
  let request;
  const fakeClient = {
    responses: {
      async create(value) {
        request = value;
        return citedResponse();
      },
    },
  };
  const provider = new OpenAIResearchClient({
    standardModel: "gpt-5.6-luna",
    deepModel: "gpt-5.6-terra",
    client: fakeClient,
  });
  const result = await provider.run({
    mode: "fact_check",
    scope: "focused",
    question: "",
    transcript: "Participant A: claim",
    safetyIdentifier: "safe",
  });
  assert.equal(request.model, "gpt-5.6-luna");
  assert.equal(request.store, false);
  assert.equal(request.tool_choice, "required");
  assert.equal(request.max_tool_calls, 2);
  assert.equal(request.max_output_tokens, 1_000);
  assert.equal(request.reasoning.effort, "low");
  assert.equal(request.tools[0].type, "web_search");
  assert.equal(request.tools[0].search_context_size, "low");
  assert.deepEqual(request.include, ["web_search_call.action.sources"]);
  assert.equal(result.webSearchCalls, 1);
  assert.equal(result.tier, "standard");
  assert.equal(result.model, "gpt-5.6-luna");
});

test("deep research uses Terra with bounded higher-depth controls", async () => {
  let request;
  let requestCount = 0;
  const provider = new OpenAIResearchClient({
    standardModel: "gpt-5.6-luna",
    deepModel: "gpt-5.6-terra",
    client: {
      responses: {
        async create(value) {
          requestCount += 1;
          request = value;
          return citedResponse();
        },
      },
    },
  });
  const result = await provider.run({
    mode: "research",
    scope: "standard",
    tier: "deep",
    question: "Compare the evidence.",
    transcript: "Participant A: claim",
    safetyIdentifier: "safe",
  });
  assert.equal(requestCount, 1);
  assert.equal(request.model, "gpt-5.6-terra");
  assert.equal(request.max_tool_calls, 5);
  assert.equal(request.max_output_tokens, 1_800);
  assert.equal(request.reasoning.effort, "medium");
  assert.equal(request.tools[0].search_context_size, "medium");
  assert.equal(request.tool_choice, "required");
  assert.equal(request.store, false);
  assert.equal(request.safety_identifier, "safe");
  assert.equal(result.tier, "deep");
});

test("research refuses an answer with no cited live-web evidence", async () => {
  const provider = new OpenAIResearchClient({
    standardModel: "gpt-5.6-luna",
    deepModel: "gpt-5.6-terra",
    client: {
      responses: {
        async create() {
          return {
            output: [
              {
                type: "message",
                content: [
                  {
                    type: "output_text",
                    text: "I answered from memory.",
                    annotations: [],
                  },
                ],
              },
            ],
          };
        },
      },
    },
  });
  await assert.rejects(
    provider.run({
      mode: "fact_check",
      scope: "focused",
      transcript: "claim",
      safetyIdentifier: "safe",
    }),
    (error) =>
      error instanceof ResearchProviderError &&
      error.code === "NO_WEB_EVIDENCE",
  );
});
