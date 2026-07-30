const SECRET_PATTERNS = Object.freeze([
  [/\bsk-[A-Za-z0-9_-]{10,}\b/g, "[API key removed]"],
  [/\b(?:Bearer\s+)[A-Za-z0-9._~+/=-]{12,}\b/gi, "[token removed]"],
  [/\b[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{20,}\b/g, "[token removed]"],
  [/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[email removed]"],
  [/\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/g, "[phone removed]"],
  [/\b(?:https?:\/\/)?(?:www\.)?(?:discord\.gg|discord(?:app)?\.com\/invite)\/[A-Za-z0-9-]+\b/gi, "[invite removed]"],
]);

export class ResearchContextError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ResearchContextError";
    this.code = code;
  }
}

function messageTimestamp(message) {
  const value =
    message.createdTimestamp ?? Date.parse(message.createdAt ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function safeEmbedText(message) {
  if (!Array.isArray(message.embeds) || message.embeds.length === 0) {
    return "";
  }
  return message.embeds
    .slice(0, 2)
    .flatMap((embed) => [
      embed.title,
      embed.description,
      embed.url,
    ])
    .filter(Boolean)
    .join("\n");
}

function rawMessageText(message) {
  return [message.content, safeEmbedText(message)]
    .filter(Boolean)
    .join("\n")
    .trim();
}

function sanitizeText(text, participantForId) {
  let sanitized = String(text ?? "").replaceAll("\u0000", " ");
  for (const [pattern, replacement] of SECRET_PATTERNS) {
    sanitized = sanitized.replace(pattern, replacement);
  }
  sanitized = sanitized
    .replace(/<@!?(\d+)>/g, (_match, id) => participantForId(id))
    .replace(/<@&\d+>/g, "[role]")
    .replace(/<#\d+>/g, "[channel]")
    .replace(/@everyone|@here/gi, "[broadcast mention]")
    .replace(/\s{3,}/g, "  ")
    .trim();
  return sanitized;
}

function participantFactory() {
  const labels = new Map();
  return (userId) => {
    if (!labels.has(userId)) {
      const index = labels.size;
      const alphabetic =
        index < 26
          ? String.fromCharCode(65 + index)
          : `A${index - 25}`;
      labels.set(userId, `Participant ${alphabetic}`);
    }
    return labels.get(userId);
  };
}

async function fetchAround(anchorMessage, limit) {
  if (!anchorMessage.channel?.messages?.fetch) {
    return [anchorMessage];
  }
  const fetched = await anchorMessage.channel.messages.fetch({
    around: anchorMessage.id,
    limit,
  });
  const messages = [...fetched.values()];
  if (!messages.some((message) => message.id === anchorMessage.id)) {
    messages.push(anchorMessage);
  }
  return messages;
}

async function fetchReplyAncestry(
  anchorMessage,
  byId,
  maximum,
  shouldInclude,
) {
  const ancestry = [];
  let current = anchorMessage;
  const seen = new Set([anchorMessage.id]);
  while (current?.reference?.messageId && ancestry.length < maximum - 1) {
    const parentId = current.reference.messageId;
    if (seen.has(parentId)) {
      break;
    }
    seen.add(parentId);
    let parent = byId.get(parentId);
    if (!parent && anchorMessage.channel?.messages?.fetch) {
      parent = await anchorMessage.channel.messages.fetch(parentId).catch(
        () => null,
      );
    }
    if (!parent) {
      break;
    }
    if (!shouldInclude(parent)) {
      break;
    }
    ancestry.push(parent);
    byId.set(parent.id, parent);
    current = parent;
  }
  return ancestry;
}

function isEligibleMessage(message, anchorId) {
  if (!message || message.channelId == null) {
    return false;
  }
  if (message.id === anchorId) {
    return true;
  }
  return Boolean(
    !message.author?.bot &&
      !message.webhookId &&
      !message.system &&
      rawMessageText(message),
  );
}

function prioritizeFocused(anchor, around, ancestry, limit) {
  const selected = [];
  const add = (message) => {
    if (
      message &&
      !selected.some((candidate) => candidate.id === message.id) &&
      selected.length < limit
    ) {
      selected.push(message);
    }
  };
  add(anchor);
  for (const message of ancestry) {
    add(message);
  }
  const threadIds = new Set(selected.map((message) => message.id));
  for (const message of around) {
    if (threadIds.has(message.reference?.messageId)) {
      add(message);
      threadIds.add(message.id);
    }
  }
  const anchorTime = messageTimestamp(anchor);
  for (const message of [...around].sort(
    (left, right) =>
      Math.abs(messageTimestamp(left) - anchorTime) -
      Math.abs(messageTimestamp(right) - anchorTime),
  )) {
    add(message);
  }
  return selected;
}

function prioritizeStandard(anchor, around, limit) {
  const anchorTime = messageTimestamp(anchor);
  const nearest = [...around].sort(
    (left, right) =>
      Math.abs(messageTimestamp(left) - anchorTime) -
      Math.abs(messageTimestamp(right) - anchorTime),
  );
  const selected = [anchor];
  for (const message of nearest) {
    if (
      message.id !== anchor.id &&
      !selected.some((candidate) => candidate.id === message.id) &&
      selected.length < limit
    ) {
      selected.push(message);
    }
  }
  return selected;
}

export async function assembleResearchContext({
  anchorMessage,
  scope,
  limits,
  isOptedOut = () => false,
}) {
  if (!anchorMessage?.id || !anchorMessage.channelId) {
    throw new ResearchContextError(
      "ANCHOR_UNAVAILABLE",
      "The selected message is no longer available.",
    );
  }
  const selectedLimit =
    scope === "standard"
      ? Math.min(limits.standardMessageLimit, 25)
      : Math.min(limits.focusedMessageLimit, 10);
  const characterLimit =
    scope === "standard"
      ? Math.min(limits.standardCharacterLimit, 12_000)
      : Math.min(limits.focusedCharacterLimit, 6_000);

  if (
    !anchorMessage.author?.bot &&
    isOptedOut(anchorMessage.author?.id)
  ) {
    throw new ResearchContextError(
      "ANCHOR_OPT_OUT",
      "The author of the selected message has opted out of AI research context.",
    );
  }

  const around = await fetchAround(anchorMessage, 25);
  const eligible = [];
  let omittedForPrivacy = 0;
  for (const message of around) {
    if (!isEligibleMessage(message, anchorMessage.id)) {
      continue;
    }
    if (
      message.id !== anchorMessage.id &&
      !message.author?.bot &&
      isOptedOut(message.author?.id)
    ) {
      omittedForPrivacy += 1;
      continue;
    }
    eligible.push(message);
  }
  const byId = new Map(eligible.map((message) => [message.id, message]));
  const ancestry =
    scope === "focused"
      ? await fetchReplyAncestry(
          anchorMessage,
          byId,
          selectedLimit,
          (message) =>
            isEligibleMessage(message, anchorMessage.id) &&
            (message.author?.bot || !isOptedOut(message.author?.id)),
        )
      : [];
  const candidates =
    scope === "standard"
      ? prioritizeStandard(anchorMessage, eligible, selectedLimit)
      : prioritizeFocused(anchorMessage, eligible, ancestry, selectedLimit);

  const participantForId = participantFactory();
  const serialized = [];
  let usedCharacters = 0;
  for (const message of candidates) {
    const raw = rawMessageText(message);
    if (!raw) {
      if (message.id === anchorMessage.id) {
        throw new ResearchContextError(
          "ANCHOR_EMPTY",
          "The selected message has no text or supported embed content to research.",
        );
      }
      continue;
    }
    const authorLabel = message.author?.bot
      ? "Bot alert"
      : participantForId(message.author?.id ?? "unknown");
    const marker =
      message.id === anchorMessage.id ? " [SELECTED MESSAGE]" : "";
    const sanitized = sanitizeText(raw, participantForId).slice(0, 1_500);
    const line = `${authorLabel}${marker}: ${sanitized}`;
    const remaining = characterLimit - usedCharacters;
    if (remaining <= 0) {
      break;
    }
    serialized.push({
      text: line.slice(0, remaining),
      timestamp: messageTimestamp(message),
    });
    usedCharacters += Math.min(line.length, remaining) + 1;
  }

  serialized.sort((left, right) => left.timestamp - right.timestamp);

  return {
    transcript: serialized.map((entry) => entry.text).join("\n"),
    messageCount: serialized.length,
    characterCount: Math.min(usedCharacters, characterLimit),
    omittedForPrivacy,
    scope,
  };
}

export { sanitizeText };
