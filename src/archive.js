import {
  AttachmentBuilder,
  EmbedBuilder,
  escapeMarkdown,
} from "discord.js";

import {
  downloadTrustedMedia,
  extensionForMedia,
  isTrustedMediaUrl,
} from "./media.js";

export const ARCHIVE_EMOJI = "⭐";
const MAX_ARCHIVE_MEDIA_BYTES = 8 * 1024 * 1024;

function isVisualContentType(contentType) {
  return (
    contentType?.startsWith("image/") ||
    contentType?.startsWith("video/")
  );
}

function selectSourceMedia(message) {
  const attachment = [...message.attachments.values()].find((candidate) =>
    isVisualContentType(candidate.contentType),
  );
  if (attachment && isTrustedMediaUrl(attachment.url)) {
    return {
      url: attachment.url,
      contentType: attachment.contentType,
      fallbackImageUrl: null,
    };
  }

  for (const sourceEmbed of message.embeds) {
    const videoUrl = sourceEmbed.video?.url;
    if (videoUrl && isTrustedMediaUrl(videoUrl)) {
      return {
        url: videoUrl,
        contentType: "video/mp4",
        fallbackImageUrl:
          sourceEmbed.thumbnail?.url ?? sourceEmbed.image?.url ?? null,
      };
    }

    const imageUrl =
      sourceEmbed.image?.url ?? sourceEmbed.thumbnail?.url ?? null;
    if (imageUrl && isTrustedMediaUrl(imageUrl)) {
      return {
        url: imageUrl,
        contentType: "image/unknown",
        fallbackImageUrl: imageUrl,
      };
    }
  }

  return null;
}

function archivedByline(message) {
  const channelName = message.channel?.name
    ? `#${message.channel.name}`
    : "the server";
  return `Archived from ${channelName}`;
}

export function archiveHeader(message, starCount) {
  const channelMention = `<#${message.channelId}>`;
  return `${ARCHIVE_EMOJI} **${starCount}** | ${channelMention}`;
}

export async function buildArchivePayload(message, starCount) {
  const authorName =
    message.member?.displayName ??
    message.author.globalName ??
    message.author.username;
  const description = message.content?.trim()
    ? message.content.trim().slice(0, 3_700)
    : "_Media-only message_";
  const embed = new EmbedBuilder()
    .setColor(0x69d2e7)
    .setAuthor({
      name: authorName,
      iconURL: message.author.displayAvatarURL(),
    })
    .setDescription(
      `${description}\n\n[Jump to the original message](${message.url})`,
    )
    .setFooter({ text: archivedByline(message) })
    .setTimestamp(message.createdAt);

  const payload = {
    content: archiveHeader(message, starCount),
    embeds: [embed],
    files: [],
    allowedMentions: { parse: [] },
  };
  const sourceMedia = selectSourceMedia(message);
  if (!sourceMedia) {
    return payload;
  }

  try {
    const downloaded = await downloadTrustedMedia(
      sourceMedia.url,
      MAX_ARCHIVE_MEDIA_BYTES,
    );
    const contentType =
      downloaded.contentType || sourceMedia.contentType;
    const extension = extensionForMedia(contentType, sourceMedia.url);
    const filename = `archive-${message.id}.${extension}`;
    payload.files.push(
      new AttachmentBuilder(downloaded.buffer, { name: filename }),
    );
    if (contentType.startsWith("image/")) {
      embed.setImage(`attachment://${filename}`);
    } else if (sourceMedia.fallbackImageUrl) {
      embed.setThumbnail(sourceMedia.fallbackImageUrl);
    }
  } catch {
    if (sourceMedia.fallbackImageUrl) {
      embed.setImage(sourceMedia.fallbackImageUrl);
    }
  }

  return payload;
}

export function archiveLogContext(message) {
  return {
    guildId: message.guildId,
    sourceChannelId: message.channelId,
    sourceMessageId: message.id,
    sourceAuthorId: message.author.id,
    sourceAuthorName: escapeMarkdown(
      message.member?.displayName ??
        message.author.globalName ??
        message.author.username,
    ),
  };
}
