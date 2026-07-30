import assert from "node:assert/strict";
import test from "node:test";

import {
  NitterPoolError,
  NitterRssTransport,
  parseNitterRss,
} from "../src/intel/nitter-transport.js";

function rss({
  handle = "UAPGERB",
  id = "1234567890123456789",
  title = "New field report &amp; photo",
  itemLink = `https://nitter.one/${handle}/status/${id}#m`,
  channelLink = `https://nitter.one/${handle}`,
} = {}) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:dc="http://purl.org/dc/elements/1.1/" version="2.0">
  <channel>
    <title>Gerb / @${handle}</title>
    <link>${channelLink}</link>
    <item>
      <title>${title}</title>
      <dc:creator>@${handle}</dc:creator>
      <description><![CDATA[
        <p>New field report &amp; photo</p>
        <img src="https://nitter.one/pic/media%2Fexample.jpg" />
        <img src="https://tracker.invalid/pixel.gif" />
      ]]></description>
      <pubDate>Tue, 28 Jul 2026 14:11:43 GMT</pubDate>
      <guid isPermaLink="false">${id}</guid>
      <link>${itemLink}</link>
    </item>
  </channel>
</rss>`;
}

function xmlResponse(body, options = {}) {
  return new Response(body, {
    status: options.status ?? 200,
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      ...(options.headers ?? {}),
    },
  });
}

test("rejects non-HTTPS, credentialed, and non-allowlisted instances", () => {
  assert.throws(
    () =>
      new NitterRssTransport({
        instances: ["http://nitter.one"],
      }),
    /HTTPS/,
  );
  assert.throws(
    () =>
      new NitterRssTransport({
        instances: ["https://user:secret@nitter.one"],
      }),
    /credentials/,
  );
  assert.throws(
    () =>
      new NitterRssTransport({
        instances: ["https://nitter.one"],
        allowedHosts: ["nitter.two"],
      }),
    /not allowlisted/,
  );
});

test("fetches without credentials and returns normalized canonical candidates", async () => {
  const requests = [];
  const transport = new NitterRssTransport({
    instances: ["https://nitter.one"],
    fetchImpl: async (url, init) => {
      requests.push({ url: url.href, init });
      return xmlResponse(rss());
    },
    now: () => Date.parse("2026-07-28T18:00:00.000Z"),
  });

  const candidates = await transport.fetchTimeline({
    key: "uapgerb",
    label: "UAP Gerb",
    handle: "@UAPGERB",
  });

  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, "https://nitter.one/UAPGERB/rss");
  assert.equal(requests[0].init.credentials, "omit");
  assert.equal(requests[0].init.redirect, "manual");
  assert.equal("Cookie" in requests[0].init.headers, false);
  assert.equal("Authorization" in requests[0].init.headers, false);
  assert.deepEqual(candidates, [
    {
      schemaVersion: 1,
      id: "x:1234567890123456789",
      candidateId: "x:1234567890123456789",
      eventId: "1234567890123456789",
      versionId: "x:1234567890123456789",
      eventType: "social-post",
      type: "social_post",
      platform: "x",
      sourceKey: "uapgerb",
      source: {
        key: "uapgerb",
        label: "UAP Gerb",
        kind: "social",
        platform: "x",
        handle: "UAPGERB",
      },
      statusId: "1234567890123456789",
      author: "@UAPGERB",
      title: "New field report & photo",
      summary: "New field report & photo",
      text: "New field report & photo",
      publishedAt: "2026-07-28T14:11:43.000Z",
      updatedAt: "2026-07-28T14:11:43.000Z",
      discoveredAt: "2026-07-28T18:00:00.000Z",
      url: "https://x.com/UAPGERB/status/1234567890123456789",
      canonicalUrl: "https://x.com/UAPGERB/status/1234567890123456789",
      media: [
        {
          kind: "image",
          url: "https://nitter.one/pic/media%2Fexample.jpg",
        },
      ],
      transport: {
        kind: "nitter-rss",
        instanceHost: "nitter.one",
      },
    },
  ]);
});

test("rejects an unallowlisted redirect and fails over to the next instance", async () => {
  const requests = [];
  const transport = new NitterRssTransport({
    instances: ["https://nitter.one", "https://nitter.two"],
    failureThreshold: 1,
    fetchImpl: async (url) => {
      requests.push(url.href);
      if (url.hostname === "nitter.one") {
        return new Response(null, {
          status: 302,
          headers: { location: "https://attacker.invalid/UAPGERB/rss" },
        });
      }
      return xmlResponse(
        rss({
          itemLink:
            "https://nitter.two/UAPGERB/status/1234567890123456789#m",
          channelLink: "https://nitter.two/UAPGERB",
        }),
      );
    },
    now: () => Date.parse("2026-07-28T18:00:00.000Z"),
  });

  const [candidate] = await transport.fetchTimeline("UAPGERB");
  assert.equal(candidate.canonicalUrl.includes("attacker.invalid"), false);
  assert.deepEqual(requests, [
    "https://nitter.one/UAPGERB/rss",
    "https://nitter.two/UAPGERB/rss",
  ]);

  const health = transport.healthSnapshot();
  assert.equal(health.status, "degraded");
  assert.equal(health.instances[0].state, "open");
  assert.equal(health.instances[0].lastError.startsWith("UNSAFE_NITTER_URL"), true);
  assert.equal(health.instances[1].totalSuccesses, 1);
});

test("enforces the streamed response-size cap and fails over", async () => {
  const responseLimit = 1_200;
  const transport = new NitterRssTransport({
    instances: ["https://nitter.one", "https://nitter.two"],
    maxResponseBytes: responseLimit,
    failureThreshold: 1,
    fetchImpl: async (url) => {
      if (url.hostname === "nitter.one") {
        return xmlResponse("x".repeat(responseLimit + 1));
      }
      return xmlResponse(
        rss({
          itemLink:
            "https://nitter.two/UAPGERB/status/1234567890123456789",
          channelLink: "https://nitter.two/UAPGERB",
        }).replaceAll("nitter.one/pic", "nitter.two/pic"),
      );
    },
  });

  const [candidate] = await transport.fetchTimeline("UAPGERB");
  assert.equal(candidate.statusId, "1234567890123456789");
  const health = transport.healthSnapshot();
  assert.match(health.instances[0].lastError, /^RSS_TOO_LARGE:/);
});

test("times out an unresponsive instance and fails over", async () => {
  const transport = new NitterRssTransport({
    instances: ["https://nitter.one", "https://nitter.two"],
    timeoutMs: 10,
    failureThreshold: 1,
    fetchImpl: async (url, init) => {
      if (url.hostname === "nitter.one") {
        return new Promise((resolve, reject) => {
          init.signal.addEventListener(
            "abort",
            () => reject(new DOMException("aborted", "AbortError")),
            { once: true },
          );
        });
      }
      return xmlResponse(
        rss({
          itemLink:
            "https://nitter.two/UAPGERB/status/1234567890123456789",
          channelLink: "https://nitter.two/UAPGERB",
        }).replaceAll("nitter.one/pic", "nitter.two/pic"),
      );
    },
  });

  const [candidate] = await transport.fetchTimeline("UAPGERB");
  assert.equal(candidate.source.handle, "UAPGERB");
  assert.match(
    transport.healthSnapshot().instances[0].lastError,
    /^NITTER_TIMEOUT:/,
  );
});

test("semantic RSS validation rejects HTML, wrong accounts, and unsafe XML", () => {
  const context = {
    feedUrl: new URL("https://nitter.one/UAPGERB/rss"),
    instanceHost: "nitter.one",
    validateUrl(url) {
      if (url.hostname !== "nitter.one" || url.protocol !== "https:") {
        throw new Error("not allowed");
      }
    },
  };

  assert.throws(
    () => parseNitterRss("<html><body>challenge</body></html>", "UAPGERB", context),
    (error) => error.code === "HTML_INSTEAD_OF_RSS",
  );
  assert.throws(
    () => parseNitterRss(rss({ handle: "WrongAccount" }), "UAPGERB", context),
    (error) => error.code === "RSS_IDENTITY_MISMATCH",
  );
  assert.throws(
    () =>
      parseNitterRss(
        '<!DOCTYPE rss [<!ENTITY secret "nope">]><rss><channel /></rss>',
        "UAPGERB",
        context,
      ),
    (error) => error.code === "UNSAFE_XML",
  );
});

test("opens circuits, reports health, suppresses requests during backoff, and recovers half-open", async () => {
  let nowMs = Date.parse("2026-07-28T18:00:00.000Z");
  let shouldSucceed = false;
  let requestCount = 0;
  const transport = new NitterRssTransport({
    instances: ["https://nitter.one"],
    failureThreshold: 1,
    baseBackoffMs: 1_000,
    maxBackoffMs: 8_000,
    now: () => nowMs,
    fetchImpl: async () => {
      requestCount += 1;
      if (!shouldSucceed) {
        return new Response("<html>challenge</html>", {
          status: 200,
          headers: { "content-type": "text/html" },
        });
      }
      return xmlResponse(rss());
    },
  });

  await assert.rejects(
    transport.fetchTimeline("UAPGERB"),
    (error) => error instanceof NitterPoolError,
  );
  let health = transport.healthSnapshot();
  assert.equal(health.status, "unavailable");
  assert.equal(health.instances[0].state, "open");
  assert.equal(
    health.instances[0].nextAttemptAt,
    "2026-07-28T18:00:01.000Z",
  );

  await assert.rejects(
    transport.fetchTimeline("UAPGERB"),
    (error) =>
      error.code === "NITTER_CIRCUITS_OPEN" &&
      error.retryAt === "2026-07-28T18:00:01.000Z",
  );
  assert.equal(requestCount, 1);

  nowMs += 1_000;
  shouldSucceed = true;
  const candidates = await transport.fetchTimeline("UAPGERB");
  assert.equal(candidates.length, 1);
  health = transport.healthSnapshot();
  assert.equal(health.status, "healthy");
  assert.equal(health.instances[0].state, "closed");
  assert.equal(health.instances[0].consecutiveFailures, 0);
  assert.equal(health.instances[0].totalSuccesses, 1);
});

test("404 source errors do not poison instance health", async () => {
  const transport = new NitterRssTransport({
    instances: ["https://nitter.one"],
    failureThreshold: 1,
    fetchImpl: async () => new Response(null, { status: 404 }),
  });

  await assert.rejects(transport.fetchTimeline("MissingAccount"));
  const health = transport.healthSnapshot();
  assert.equal(health.status, "healthy");
  assert.equal(health.instances[0].state, "closed");
  assert.equal(health.instances[0].totalFailures, 1);
  assert.equal(health.instances[0].healthFailures, 0);
});
