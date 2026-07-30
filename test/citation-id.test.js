import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCitationCustomId,
  isCitationCustomId,
  parseCitationCustomId,
} from "../src/citation-id.js";

const context = {
  channelId: "100000000000000001",
  messageId: "100000000000000002",
  targetUserId: "100000000000000005",
  invokerId: "100000000000000006",
};

test("citation context round-trips through a Discord custom ID", () => {
  const customId = buildCitationCustomId(context);

  assert.ok(customId.length <= 100);
  assert.ok(isCitationCustomId(customId));
  assert.deepEqual(parseCitationCustomId(customId), context);
});

test("malformed citation IDs are rejected", () => {
  assert.equal(parseCitationCustomId("citation:v1:not-a-snowflake"), null);
  assert.equal(isCitationCustomId("different:v1:123"), false);
  assert.throws(
    () => buildCitationCustomId({ ...context, messageId: "not-a-snowflake" }),
    /snowflakes/,
  );
});
