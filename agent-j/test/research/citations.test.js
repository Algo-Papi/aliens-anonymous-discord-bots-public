import assert from "node:assert/strict";
import test from "node:test";

import { citedMarkdownFromResponse } from "../../src/research/citations.js";

test("verified annotations become clickable Discord citations", () => {
  const text = "The claim is supported (citation). Raw https://bad.example.";
  const start = text.indexOf("(citation)");
  const result = citedMarkdownFromResponse({
    output: [
      {
        type: "web_search_call",
        status: "completed",
        action: {
          sources: [
            { url: "https://source.example/report", title: "Primary report" },
          ],
        },
      },
      {
        type: "message",
        content: [
          {
            type: "output_text",
            text,
            annotations: [
              {
                type: "url_citation",
                start_index: start,
                end_index: start + "(citation)".length,
                url: "https://source.example/report",
                title: "Primary report",
              },
            ],
          },
        ],
      },
    ],
  });
  assert.equal(result.hasRequiredEvidence, true);
  assert.match(
    result.markdown,
    /\[Source 1\]\(https:\/\/source\.example\/report\)/,
  );
  assert.doesNotMatch(result.markdown, /https:\/\/bad\.example/);
  assert.match(result.markdown, /\*\*Sources\*\*/);
});

test("a response without a completed web search is not publishable", () => {
  const result = citedMarkdownFromResponse({
    output: [
      {
        type: "message",
        content: [
          { type: "output_text", text: "Unsupported text", annotations: [] },
        ],
      },
    ],
  });
  assert.equal(result.hasRequiredEvidence, false);
});
