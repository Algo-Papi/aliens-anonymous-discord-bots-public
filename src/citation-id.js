const PREFIX = "citation:v1";
const SNOWFLAKE = /^\d{16,22}$/;

export function buildCitationCustomId({
  channelId,
  messageId,
  targetUserId,
  invokerId,
}) {
  const ids = [channelId, messageId, targetUserId, invokerId];
  if (!ids.every((value) => SNOWFLAKE.test(value))) {
    throw new Error("Citation IDs must be Discord snowflakes.");
  }

  const customId = [PREFIX, ...ids].join(":");
  if (customId.length > 100) {
    throw new Error("Citation custom ID exceeds Discord's 100-character limit.");
  }
  return customId;
}

export function parseCitationCustomId(customId) {
  const [kind, version, channelId, messageId, targetUserId, invokerId, extra] =
    customId.split(":");

  if (
    `${kind}:${version}` !== PREFIX ||
    extra !== undefined ||
    ![channelId, messageId, targetUserId, invokerId].every((value) =>
      SNOWFLAKE.test(value),
    )
  ) {
    return null;
  }

  return { channelId, messageId, targetUserId, invokerId };
}

export function isCitationCustomId(customId) {
  return customId.startsWith(`${PREFIX}:`);
}
