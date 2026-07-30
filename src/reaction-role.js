export function isFieldClearanceReaction(
  {
    guildId,
    channelId,
    messageId,
    emojiName,
    userIsBot = false,
  },
  config,
) {
  return Boolean(
    !userIsBot &&
      config.fieldClearanceMessageId &&
      guildId === config.guildId &&
      channelId === config.qAndAChannelId &&
      messageId === config.fieldClearanceMessageId &&
      emojiName === config.fieldClearanceEmoji,
  );
}
