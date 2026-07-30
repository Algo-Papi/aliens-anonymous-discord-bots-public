import assert from "node:assert/strict";
import test from "node:test";

import {
  isNitterStatusUrl,
  nitterLinkToX,
  parseNitterFeed,
} from "../src/nitter.js";

const SAMPLE_FEED = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:dc="http://purl.org/dc/elements/1.1/" version="2.0">
  <channel>
    <title>Gerb / @UAPGERB</title>
    <item>
      <title>New field report &amp; photo</title>
      <dc:creator>@UAPGERB</dc:creator>
      <description><![CDATA[
        <p>New field report &amp; photo</p>
        <img src="https://nitter.net/pic/media%2Fexample.jpg" />
      ]]></description>
      <pubDate>Tue, 28 Jul 2026 14:11:43 GMT</pubDate>
      <guid isPermaLink="false">1234567890123456789</guid>
      <link>https://nitter.net/UAPGERB/status/1234567890123456789#m</link>
    </item>
  </channel>
</rss>`;

test("parses Nitter RSS into an X alert with media", () => {
  const [item] = parseNitterFeed(SAMPLE_FEED);
  assert.equal(item.id, "1234567890123456789");
  assert.equal(item.title, "New field report & photo");
  assert.equal(item.author, "@UAPGERB");
  assert.equal(
    item.mediaUrl,
    "https://nitter.net/pic/media%2Fexample.jpg",
  );
  assert.equal(item.mediaKind, "image");
  assert.equal(
    item.xUrl,
    "https://x.com/UAPGERB/status/1234567890123456789",
  );
});

test("only converts Nitter links to X", () => {
  assert.equal(
    nitterLinkToX("https://example.com/post/1"),
    "https://example.com/post/1",
  );
});

test("recognizes only Nitter status item URLs", () => {
  assert.equal(
    isNitterStatusUrl(
      "https://nitter.net/UAPGERB/status/1234567890123456789#m",
    ),
    true,
  );
  assert.equal(isNitterStatusUrl("https://nitter.net/UAPGERB/rss"), false);
  assert.equal(
    isNitterStatusUrl(
      "https://news.google.com/rss/articles/example",
    ),
    false,
  );
});
