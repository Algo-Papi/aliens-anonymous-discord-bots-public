import assert from "node:assert/strict";
import test from "node:test";

import { loadRuntimeConfig } from "../src/config.js";

const CONFIG_KEYS = [
  "DISCORD_TOKEN",
  "DISCORD_CLIENT_ID",
  "DISCORD_GUILD_ID",
  "ARCHIVE_ENABLED",
  "ARCHIVE_CHANNEL_ID",
  "NITTER_MONITOR_ENABLED",
  "UAP_ALERT_CHANNEL_ID",
  "EARTH_INTEL_ENABLED",
  "EARTH_INTEL_CHANNEL_ID",
  "BUMP_REMINDER_ENABLED",
  "BUMP_REMINDER_CHANNEL_ID",
  "BUMP_CREW_ROLE_ID",
  "DISBOARD_USER_ID",
  "Q_AND_A_CHANNEL_ID",
  "FIELD_CLEARANCE_ROLE_ID",
  "FIELD_CLEARANCE_MESSAGE_ID",
];

function withEnvironment(values, callback) {
  const previous = new Map(CONFIG_KEYS.map((key) => [key, process.env[key]]));
  for (const key of CONFIG_KEYS) {
    delete process.env[key];
  }
  Object.assign(process.env, values);

  try {
    return callback();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

const REQUIRED = {
  DISCORD_TOKEN: "synthetic-test-token",
  DISCORD_CLIENT_ID: "111111111111111111",
  DISCORD_GUILD_ID: "222222222222222222",
};

test("public configuration requires installer-owned application and guild IDs", () => {
  withEnvironment(
    {
      DISCORD_TOKEN: REQUIRED.DISCORD_TOKEN,
      DISCORD_GUILD_ID: REQUIRED.DISCORD_GUILD_ID,
    },
    () => {
      assert.throws(
        () => loadRuntimeConfig(),
        /DISCORD_CLIENT_ID/,
      );
    },
  );
});

test("optional publishing features default disabled with blank IDs", () => {
  withEnvironment(REQUIRED, () => {
    const config = loadRuntimeConfig();

    assert.equal(config.archiveEnabled, false);
    assert.equal(config.nitterMonitorEnabled, false);
    assert.equal(config.earthIntelEnabled, false);
    assert.equal(config.bumpReminderEnabled, false);
    assert.equal(config.archiveChannelId, "");
    assert.equal(config.alertChannelId, "");
    assert.equal(config.earthIntelChannelId, "");
  });
});

test("enabled features fail closed when their destination is missing", () => {
  withEnvironment(
    {
      ...REQUIRED,
      ARCHIVE_ENABLED: "true",
    },
    () => {
      assert.throws(
        () => loadRuntimeConfig(),
        /ARCHIVE_CHANNEL_ID/,
      );
    },
  );
});

test("reaction-role configuration must be complete or entirely absent", () => {
  withEnvironment(
    {
      ...REQUIRED,
      Q_AND_A_CHANNEL_ID: "333333333333333333",
    },
    () => {
      assert.throws(
        () => loadRuntimeConfig(),
        /FIELD_CLEARANCE_ROLE_ID, FIELD_CLEARANCE_MESSAGE_ID/,
      );
    },
  );
});
