import { createHash } from "node:crypto";

const TRACKING_PARAMETERS = new Set([
  "fbclid",
  "gclid",
  "ref",
  "source",
]);

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "has",
  "have",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "this",
  "to",
  "was",
  "were",
  "with",
]);

const SAFE_HEADLINE_PREFIXES =
  /^(?:(?:breaking(?:\s+news)?|developing|just\s+in|update|updated|rt\s+by\s+@[a-z0-9_]+|r\s+to\s+@[a-z0-9_]+)\s*[:\-\u2013\u2014]\s*)+/iu;

for (const word of [
  "after",
  "been",
  "including",
  "official",
  "officials",
  "people",
  "report",
  "reports",
  "say",
  "says",
  "according",
  "department",
  "komo",
  "axios",
  "senior",
  "tonight",
  "carried",
  "out",
  "surprise",
]) {
  STOP_WORDS.add(word);
}

const TOKEN_ALIASES = Object.freeze({
  one: "1",
  two: "2",
  three: "3",
  four: "4",
  five: "5",
  six: "6",
  seven: "7",
  eight: "8",
  nine: "9",
  ten: "10",
  dead: "killed",
  death: "killed",
  deaths: "killed",
  fatalities: "killed",
  fatality: "killed",
  wound: "injured",
  wounded: "injured",
  injuries: "injured",
  shoots: "shooting",
  shot: "shooting",
  american: "us",
  iranian: "iran",
  launched: "launch",
  launches: "launch",
  missiles: "missile",
  bases: "base",
  forces: "military",
  towards: "toward",
});

function cleanKey(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

export function canonicalizeStoryUrl(value) {
  try {
    const url = new URL(value);
    url.protocol = "https:";
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    if (url.hostname === "twitter.com") {
      url.hostname = "x.com";
    }
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (
        TRACKING_PARAMETERS.has(key.toLowerCase()) ||
        key.toLowerCase().startsWith("utm_")
      ) {
        url.searchParams.delete(key);
      }
    }
    url.searchParams.sort();
    url.pathname = url.pathname.replace(/\/+$/, "") || "/";
    return url.href;
  } catch {
    return "";
  }
}

export function headlineTokens(value) {
  const cleaned = String(value ?? "")
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\bU\.S\.(?:A\.)?/giu, " US ")
    .replace(SAFE_HEADLINE_PREFIXES, "")
    .replace(/https?:\/\/\S+/giu, " ")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim();

  return [
    ...new Set(
      cleaned
        .split(/\s+/)
        .map((token) => TOKEN_ALIASES[token] ?? token)
        .filter((token) => token && !STOP_WORDS.has(token)),
    ),
  ];
}

export function storyFingerprint(story = {}) {
  const eventKeys = [
    ...new Set(
      (Array.isArray(story.eventKeys) ? story.eventKeys : [])
        .map(cleanKey)
        .filter(Boolean),
    ),
  ].sort();
  const canonicalUrl = canonicalizeStoryUrl(story.url);
  const tokens = headlineTokens(story.title).sort();
  const basis = eventKeys.length > 0
    ? `events:${eventKeys.join("|")}`
    : canonicalUrl
      ? `url:${canonicalUrl}`
      : `title:${tokens.join("|")}`;
  const digest = createHash("sha256")
    .update(basis)
    .digest("hex")
    .slice(0, 24);
  return `earth-intel:v1:${digest}`;
}

function intersectionSize(left, right) {
  let count = 0;
  for (const value of left) {
    if (right.has(value)) {
      count += 1;
    }
  }
  return count;
}

function jaccard(leftValues, rightValues) {
  const left = new Set(leftValues);
  const right = new Set(rightValues);
  const unionSize = new Set([...left, ...right]).size;
  return unionSize === 0
    ? 0
    : intersectionSize(left, right) / unionSize;
}

export function storySimilarity(left = {}, right = {}) {
  const leftEvents = new Set(
    (left.eventKeys ?? []).map(cleanKey).filter(Boolean),
  );
  const rightEvents = new Set(
    (right.eventKeys ?? []).map(cleanKey).filter(Boolean),
  );
  if (intersectionSize(leftEvents, rightEvents) > 0) {
    return 1;
  }

  const leftUrl = canonicalizeStoryUrl(left.url);
  const rightUrl = canonicalizeStoryUrl(right.url);
  if (leftUrl && leftUrl === rightUrl) {
    return 1;
  }

  const titleScore = jaccard(
    headlineTokens(left.title),
    headlineTokens(right.title),
  );
  const leftEntities = (left.entities ?? [])
    .map(cleanKey)
    .filter(Boolean);
  const rightEntities = (right.entities ?? [])
    .map(cleanKey)
    .filter(Boolean);
  if (leftEntities.length === 0 || rightEntities.length === 0) {
    return titleScore;
  }
  return titleScore * 0.55 + jaccard(leftEntities, rightEntities) * 0.45;
}

export function shouldClusterStories(
  left,
  right,
  {
    maximumTimeDistanceMs = 36 * 60 * 60 * 1_000,
    minimumSimilarity = 0.55,
  } = {},
) {
  const leftEvents = new Set(
    (left?.eventKeys ?? []).map(cleanKey).filter(Boolean),
  );
  const rightEvents = new Set(
    (right?.eventKeys ?? []).map(cleanKey).filter(Boolean),
  );
  if (intersectionSize(leftEvents, rightEvents) > 0) {
    return true;
  }

  const leftTime = Date.parse(left?.publishedAt ?? "");
  const rightTime = Date.parse(right?.publishedAt ?? "");
  if (
    Number.isFinite(leftTime) &&
    Number.isFinite(rightTime) &&
    Math.abs(leftTime - rightTime) > maximumTimeDistanceMs
  ) {
    return false;
  }

  const leftTokens = headlineTokens(left?.title);
  const rightTokens = headlineTokens(right?.title);
  const sameUrl =
    canonicalizeStoryUrl(left?.url) !== "" &&
    canonicalizeStoryUrl(left?.url) ===
      canonicalizeStoryUrl(right?.url);
  if (sameUrl) {
    return true;
  }
  if (Math.min(leftTokens.length, rightTokens.length) < 4) {
    return false;
  }
  return (
    storySimilarity(left, right) >= minimumSimilarity
  );
}

/**
 * Graph clustering is used instead of a greedy representative so transitive
 * updates (A matches B, B matches C) remain in one story card.
 */
export function clusterStories(stories = [], options = {}) {
  const items = Array.isArray(stories) ? stories : [];
  const parents = items.map((_, index) => index);

  function find(index) {
    let cursor = index;
    while (parents[cursor] !== cursor) {
      parents[cursor] = parents[parents[cursor]];
      cursor = parents[cursor];
    }
    return cursor;
  }

  function union(left, right) {
    const leftRoot = find(left);
    const rightRoot = find(right);
    if (leftRoot !== rightRoot) {
      parents[rightRoot] = leftRoot;
    }
  }

  for (let left = 0; left < items.length; left += 1) {
    for (let right = left + 1; right < items.length; right += 1) {
      if (shouldClusterStories(items[left], items[right], options)) {
        union(left, right);
      }
    }
  }

  const clusters = new Map();
  items.forEach((item, index) => {
    const root = find(index);
    if (!clusters.has(root)) {
      clusters.set(root, []);
    }
    clusters.get(root).push(item);
  });
  return [...clusters.values()];
}
