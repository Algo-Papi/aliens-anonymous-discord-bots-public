import https from "node:https";

import {
  AttachmentBuilder,
  EmbedBuilder,
} from "discord.js";
import { XMLParser } from "fast-xml-parser";

import {
  downloadTrustedMedia,
  extensionForMedia,
} from "./media.js";

export const NITTER_SOURCES = Object.freeze([
  {
    key: "uapgerb",
    label: "UAP Gerb",
    handle: "UAPGERB",
    feedUrl: "https://nitter.net/UAPGERB/rss",
  },
  {
    key: "american-alchemy",
    label: "Jesse Michels / American Alchemy",
    handle: "AlchemyAmerican",
    feedUrl: "https://nitter.net/AlchemyAmerican/rss",
  },
  {
    key: "missileman",
    label: "Missileman",
    handle: "MinuteofZombie",
    feedUrl: "https://nitter.net/MinuteofZombie/rss",
  },
  {
    key: "rob-jones",
    label: "Rob Jones",
    handle: "robjonesreports",
    feedUrl: "https://nitter.net/robjonesreports/rss",
  },
]);

const parser = new XMLParser({
  ignoreAttributes: false,
  processEntities: true,
  removeNSPrefix: true,
});
const MAX_ALERT_MEDIA_BYTES = 8 * 1024 * 1024;
const RSS_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
  "AppleWebKit/537.36 Chrome/138 Safari/537.36";

function asArray(value) {
  if (value === undefined || value === null) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function guidValue(guid) {
  if (typeof guid === "string" || typeof guid === "number") {
    return String(guid);
  }
  return String(guid?.["#text"] ?? "");
}

export function nitterLinkToX(link) {
  try {
    const url = new URL(link);
    if (url.hostname !== "nitter.net") {
      return link;
    }
    url.hostname = "x.com";
    url.hash = "";
    return url.href;
  } catch {
    return link;
  }
}

export function isNitterStatusUrl(value) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname === "nitter.net" &&
      /\/[^/]+\/status\/\d+/.test(url.pathname)
    );
  } catch {
    return false;
  }
}

function extractAttribute(html, tagName, attributeName) {
  const tagExpression = new RegExp(
    `<${tagName}\\b[^>]*\\b${attributeName}=(?:\"([^\"]+)\"|'([^']+)')[^>]*>`,
    "i",
  );
  const match = String(html ?? "").match(tagExpression);
  return match?.[1] ?? match?.[2] ?? null;
}

export function parseNitterFeed(xml) {
  const parsed = parser.parse(xml);
  const channel = parsed?.rss?.channel;
  if (!channel) {
    throw new Error("Nitter response was not a valid RSS channel.");
  }

  return asArray(channel.item)
    .map((item) => {
      const id = guidValue(item.guid) || String(item.link ?? "");
      const publishedAt = Date.parse(item.pubDate ?? "");
      const description = String(item.description ?? "");
      const videoUrl =
        extractAttribute(description, "source", "src") ??
        extractAttribute(description, "video", "src");
      const imageUrl =
        extractAttribute(description, "img", "src") ??
        extractAttribute(description, "video", "poster");
      return {
        id,
        title: String(item.title ?? "").trim(),
        author: String(item.creator ?? "").trim(),
        link: String(item.link ?? "").trim(),
        xUrl: nitterLinkToX(String(item.link ?? "").trim()),
        publishedAt: Number.isFinite(publishedAt)
          ? publishedAt
          : Date.now(),
        mediaUrl: videoUrl ?? imageUrl,
        mediaKind: videoUrl ? "video" : imageUrl ? "image" : null,
      };
    })
    .filter((item) => item.id && item.link)
    .sort((left, right) => left.publishedAt - right.publishedAt);
}

function requestText(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      {
        headers: {
          Accept: "application/rss+xml, application/xml;q=0.9, */*;q=0.8",
          "User-Agent": RSS_USER_AGENT,
        },
      },
      (response) => {
        const status = response.statusCode ?? 0;
        if (status < 200 || status >= 300) {
          response.resume();
          reject(new Error(`Nitter returned HTTP ${status}.`));
          return;
        }
        response.setEncoding("utf8");
        let body = "";
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          if (!body.trim()) {
            reject(new Error("Nitter returned an empty RSS response."));
            return;
          }
          resolve(body);
        });
      },
    );
    request.setTimeout(20_000, () => {
      request.destroy(new Error("Nitter RSS request timed out."));
    });
    request.on("error", reject);
  });
}

export async function fetchNitterItems(source) {
  return parseNitterFeed(await requestText(source.feedUrl));
}

export async function buildNitterAlertPayload(source, item) {
  const author = item.author || `@${source.handle}`;
  const embed = new EmbedBuilder()
    .setColor(0x111820)
    .setAuthor({ name: `${source.label} · ${author}`.slice(0, 256) })
    .setTitle("View post on X")
    .setURL(item.xUrl)
    .setDescription(item.title.slice(0, 4_000) || "_No text in this post._")
    .setFooter({ text: "Free X monitor · via Nitter RSS" })
    .setTimestamp(item.publishedAt);
  const payload = {
    content: `🛰️ **X monitor** · ${source.label}`,
    embeds: [embed],
    files: [],
    allowedMentions: { parse: [] },
  };

  if (!item.mediaUrl) {
    return payload;
  }

  try {
    const downloaded = await downloadTrustedMedia(
      item.mediaUrl,
      MAX_ALERT_MEDIA_BYTES,
    );
    const extension = extensionForMedia(
      downloaded.contentType,
      item.mediaUrl,
    );
    const filename = `x-${source.key}-${item.id}.${extension}`;
    payload.files.push(
      new AttachmentBuilder(downloaded.buffer, { name: filename }),
    );
    if (downloaded.contentType.startsWith("image/")) {
      embed.setImage(`attachment://${filename}`);
    }
  } catch {
    if (item.mediaKind === "image") {
      embed.setImage(item.mediaUrl);
    }
  }

  return payload;
}
