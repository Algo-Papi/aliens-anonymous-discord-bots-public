import assert from "node:assert/strict";
import test from "node:test";

import {
  IntelHttpError,
  requestJson,
  requestText,
} from "../src/intel/http.js";

test("official feed requests round-trip conditional validators", async () => {
  let receivedHeaders;
  let observedValidators;
  const result = await requestText("https://example.test/feed", {
    validators: {
      etag: '"old"',
      lastModified: "Tue, 28 Jul 2026 20:00:00 GMT",
    },
    fetchImpl: async (_url, options) => {
      receivedHeaders = options.headers;
      return new Response(null, {
        status: 304,
        headers: {
          ETag: '"new"',
        },
      });
    },
    onValidators: (validators) => {
      observedValidators = validators;
    },
  });

  assert.equal(receivedHeaders.get("if-none-match"), '"old"');
  assert.equal(
    receivedHeaders.get("if-modified-since"),
    "Tue, 28 Jul 2026 20:00:00 GMT",
  );
  assert.equal(result.notModified, true);
  assert.equal(result.text, null);
  assert.deepEqual(result.validators, {
    etag: '"new"',
    lastModified: "Tue, 28 Jul 2026 20:00:00 GMT",
  });
  assert.deepEqual(observedValidators, result.validators);
});

test("official feed requests reject declared oversized bodies", async () => {
  await assert.rejects(
    requestText("https://example.test/large", {
      maximumBytes: 10,
      fetchImpl: async () =>
        new Response("small", {
          headers: {
            "Content-Length": "100",
          },
        }),
    }),
    (error) =>
      error instanceof IntelHttpError &&
      error.code === "BODY_TOO_LARGE",
  );
});

test("official feed requests enforce a timeout", async () => {
  await assert.rejects(
    requestText("https://example.test/hangs", {
      timeoutMs: 10,
      fetchImpl: async (_url, { signal }) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener(
            "abort",
            () => reject(signal.reason),
            { once: true },
          );
        }),
    }),
    (error) =>
      error instanceof IntelHttpError && error.code === "TIMEOUT",
  );
});

test("official JSON requests reject malformed source data", async () => {
  await assert.rejects(
    requestJson("https://example.test/not-json", {
      fetchImpl: async () => new Response("{broken"),
    }),
    (error) =>
      error instanceof IntelHttpError && error.code === "INVALID_JSON",
  );
});
