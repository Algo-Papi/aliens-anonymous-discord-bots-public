const SEVERITY_LEVELS = Object.freeze([
  "informational",
  "notable",
  "high",
  "severe",
  "extreme",
]);

export function collapseWhitespace(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

export function truncateText(value, maximumLength) {
  const text = collapseWhitespace(value);
  if (text.length <= maximumLength) {
    return text;
  }
  return `${text.slice(0, Math.max(0, maximumLength - 1)).trimEnd()}…`;
}

export function uniqueStrings(values) {
  return [
    ...new Set(
      values
        .map((value) => collapseWhitespace(value))
        .filter(Boolean),
    ),
  ];
}

export function toTimestamp(value, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  const parsed = Date.parse(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function severityLevel(rank) {
  const normalizedRank = Math.max(1, Math.min(5, Number(rank) || 1));
  return SEVERITY_LEVELS[normalizedRank - 1];
}

/**
 * Shared candidate contract for the ingestion and policy layers.
 *
 * `id` is stable for the underlying event so a later advisory can update one
 * Discord story. `versionId` changes when the official source changes it.
 */
export function createOfficialCandidate({
  sourceKey,
  sourceLabel,
  authority,
  eventId,
  versionToken,
  eventType,
  title,
  summary,
  url,
  publishedAt,
  updatedAt = publishedAt,
  endsAt = null,
  severityRank,
  severityLabel,
  geography = {},
  tags = [],
  metadata = {},
}) {
  const normalizedSourceKey = collapseWhitespace(sourceKey);
  const normalizedEventId = collapseWhitespace(eventId);
  const normalizedTitle = collapseWhitespace(title);
  const normalizedUrl = collapseWhitespace(url);

  if (
    !normalizedSourceKey ||
    !normalizedEventId ||
    !normalizedTitle ||
    !normalizedUrl
  ) {
    throw new TypeError(
      "Official candidates require a source, event id, title, and URL.",
    );
  }

  const rank = Math.max(1, Math.min(5, Number(severityRank) || 1));
  const published = toTimestamp(publishedAt);
  const updated = toTimestamp(updatedAt, published);
  const ending = endsAt === null ? null : toTimestamp(endsAt);
  const version = collapseWhitespace(versionToken) || String(updated);
  const candidateId = `${normalizedSourceKey}:${normalizedEventId}`;
  const normalizedSummary = truncateText(summary, 1_500);
  const coordinates = geography.coordinates
    ? {
        latitude: Number(geography.coordinates.latitude),
        longitude: Number(geography.coordinates.longitude),
      }
    : null;

  return Object.freeze({
    schemaVersion: 1,
    id: candidateId,
    candidateId,
    eventId: normalizedEventId,
    versionId: `${normalizedSourceKey}:${normalizedEventId}:${version}`,
    sourceKey: normalizedSourceKey,
    source: Object.freeze({
      key: normalizedSourceKey,
      label: collapseWhitespace(sourceLabel),
      kind: "official",
      authority: collapseWhitespace(authority),
    }),
    eventType: collapseWhitespace(eventType),
    type: "official_event",
    title: normalizedTitle,
    summary: normalizedSummary,
    text: normalizedSummary,
    url: normalizedUrl,
    canonicalUrl: normalizedUrl,
    publishedAt: new Date(published).toISOString(),
    publishedAtMs: published,
    updatedAt: new Date(updated).toISOString(),
    updatedAtMs: updated,
    endsAt: ending === null ? null : new Date(ending).toISOString(),
    endsAtMs: ending,
    severity: Object.freeze({
      level: severityLevel(rank),
      rank,
      label: collapseWhitespace(severityLabel),
    }),
    geography: Object.freeze({
      scope: collapseWhitespace(geography.scope) || "unknown",
      countryCode:
        collapseWhitespace(geography.countryCode).toUpperCase() || null,
      areas: Object.freeze(uniqueStrings(geography.areas ?? [])),
      coordinates:
        coordinates &&
        Number.isFinite(coordinates.latitude) &&
        Number.isFinite(coordinates.longitude)
          ? Object.freeze(coordinates)
          : null,
    }),
    evidence: Object.freeze({
      status: "confirmed",
      official: true,
    }),
    tags: Object.freeze(uniqueStrings(tags)),
    metadata: Object.freeze({ ...metadata }),
  });
}
