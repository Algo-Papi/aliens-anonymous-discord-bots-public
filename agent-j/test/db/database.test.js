import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  getSchemaVersion,
  openDatabase,
} from "../../src/db/database.js";
import { UserStore } from "../../src/db/user-store.js";

test("database migrations and privacy preferences persist", (context) => {
  const directory = mkdtempSync(join(tmpdir(), "agent-j-db-"));
  const path = join(directory, "agent-j.sqlite");
  const database = openDatabase(path);
  context.after(() => {
    database.close();
    rmSync(directory, { recursive: true, force: true });
  });

  assert.equal(getSchemaVersion(database), 5);
  assert.equal(database.pragma("journal_mode", { simple: true }), "wal");
  assert.equal(database.pragma("foreign_keys", { simple: true }), 1);

  const users = new UserStore(database, { now: () => 1_000 });
  assert.deepEqual(users.peekPrivacy("guild", "unseen"), {
    targetOptOut: false,
    witnessOptOut: false,
    aiContextOptOut: false,
  });
  assert.equal(users.get("guild", "unseen"), null);
  assert.deepEqual(users.getPrivacy("guild", "user"), {
    targetOptOut: false,
    witnessOptOut: false,
    aiContextOptOut: false,
  });
  assert.deepEqual(
    users.setPrivacy("guild", "user", {
      targetOptOut: true,
      witnessOptOut: true,
      aiContextOptOut: true,
    }),
    {
      targetOptOut: true,
      witnessOptOut: true,
      aiContextOptOut: true,
    },
  );
  assert.deepEqual(users.getPrivacy("guild", "user"), {
    targetOptOut: true,
    witnessOptOut: true,
    aiContextOptOut: true,
  });
});
