import { REST, Routes } from "discord.js";

import { loadRuntimeConfig } from "../src/config.js";

const action = process.argv[2];
const messageId = process.argv[3];
const config = loadRuntimeConfig();
const rest = new REST({ version: "10" }).setToken(config.token);
const channelId =
  action === "post"
    ? process.argv[3] || config.testChannelId
    : process.argv[4] || config.testChannelId;

if (action === "post") {
  const message = await rest.post(Routes.channelMessages(channelId), {
    body: {
      content:
        "🧪 **AGENT J RESEARCH TEST ANCHOR**\n" +
        "Synthetic claim for private verification: NASA maintains a current official public status for the Artemis II mission. This message will be removed after the test.",
      allowed_mentions: { parse: [] },
    },
  });
  console.log(
    JSON.stringify(
      {
        messageId: message.id,
        channelId,
        url:
          `https://discord.com/channels/${config.guildId}/` +
          `${channelId}/${message.id}`,
      },
      null,
      2,
    ),
  );
} else if (action === "delete" && messageId) {
  await rest.delete(Routes.channelMessage(channelId, messageId));
  console.log(`Deleted research test anchor ${messageId}.`);
} else {
  throw new Error(
    "Usage: node scripts/research-test-anchor.js post [channel-id] | delete <message-id> [channel-id]",
  );
}
