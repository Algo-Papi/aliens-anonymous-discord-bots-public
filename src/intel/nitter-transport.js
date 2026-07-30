import { XMLParser, XMLValidator } from "fast-xml-parser";

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_RESPONSE_BYTES = 1_500_000;
const DEFAULT_MAX_REDIRECTS = 2;
const DEFAULT_FAILURE_THRESHOLD = 2;
const DEFAULT_BASE_BACKOFF_MS = 30_000;
const DEFAULT_MAX_BACKOFF_MS = 15 * 60_000;
const DEFAULT_USER_AGENT =
  "AliensAnonymous-EarthIntel/1.0 (credential-free RSS reader)";

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const XML_CONTENT_TYPES = [
  "application/atom+xml",
  "application/rss+xml",
  "application/xml",
  "text/xml",
];

const rssParser = new XMLParser({
  ignoreAttributes: false,
  processEntities: true,
  removeNSPrefix: true,
  trimValues: true,
});

export class NitterTransportError extends Error {
  constructor(
    message,
    {
      code = "NITTER_TRANSPORT_ERROR",
      cause,
      affectsHealth = true,
      instanceHost = null,
      retryAfterMs = null,
    } = {},
  ) {
    super(message, { cause });
    this.name = "NitterTransportError";
    this.code = code;
    this.affectsHealth = affectsHealth;
    this.instanceHost = instanceHost;
    this.retryAfterMs = retryAfterMs;
  }
}

export class NitterPoolError extends AggregateError {
  constructor(
    errors,
    message,
    {
      code = "NITTER_POOL_UNAVAILABLE",
      retryAt = null,
      health = null,
    } = {},
  ) {
    super(errors, message);
    this.name = "NitterPoolError";
    this.code = code;
    this.retryAt = retryAt;
    this.health = health;
  }
}

function requireInteger(value, name, minimum) {
  if (!Number.isInteger(value) || value < minimum) {
    throw new TypeError(`${name} must be an integer of at least ${minimum}.`);
  }
  return value;
}

function normalizeAllowedHost(value) {
  const candidate = String(value ?? "").trim().toLowerCase();
  if (!candidate) {
    throw new TypeError("Nitter allowlist entries cannot be empty.");
  }

  let parsed;
  try {
    parsed = new URL(`https://${candidate}`);
  } catch {
    throw new TypeError(`Invalid Nitter allowlist host: ${candidate}`);
  }

  if (
    parsed.hostname !== candidate ||
    parsed.username ||
    parsed.password ||
    parsed.port ||
    parsed.pathname !== "/"
  ) {
    throw new TypeError(
      `Nitter allowlist entries must be bare hostnames: ${candidate}`,
    );
  }
  return parsed.hostname.toLowerCase();
}

function normalizeInstanceUrl(value) {
  let parsed;
  try {
    parsed = new URL(String(value));
  } catch {
    throw new TypeError(`Invalid Nitter instance URL: ${value}`);
  }

  if (parsed.protocol !== "https:") {
    throw new TypeError("Nitter instances must use HTTPS.");
  }
  if (parsed.username || parsed.password) {
    throw new TypeError(
      "Nitter instance URLs cannot contain account credentials.",
    );
  }
  if (parsed.search || parsed.hash) {
    throw new TypeError(
      "Nitter instance URLs cannot contain a query string or fragment.",
    );
  }

  parsed.pathname = `${parsed.pathname.replace(/\/+$/, "")}/`;
  return parsed;
}

function normalizeSource(value) {
  const source =
    typeof value === "string"
      ? { handle: value }
      : value && typeof value === "object"
        ? value
        : {};
  const handle = String(source.handle ?? "")
    .trim()
    .replace(/^@/, "");
  if (!/^[A-Za-z0-9_]{1,15}$/.test(handle)) {
    throw new TypeError(`Invalid X account handle: ${source.handle ?? ""}`);
  }

  const key = String(source.key ?? handle.toLowerCase()).trim();
  const label = String(source.label ?? `@${handle}`).trim();
  if (!key || !label) {
    throw new TypeError("Nitter sources require non-empty keys and labels.");
  }
  return Object.freeze({ key, label, handle });
}

function stringValue(value) {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  if (value && typeof value === "object") {
    return String(value["#text"] ?? "");
  }
  return "";
}

function asArray(value) {
  if (value === undefined || value === null) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function stripMarkup(value) {
  return String(value ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractStatusId(guid, link) {
  const guidText = stringValue(guid).trim();
  if (/^\d{5,30}$/.test(guidText)) {
    return guidText;
  }
  return (
    guidText.match(/\/status\/(\d{5,30})/)?.[1] ??
    String(link ?? "").match(/\/status\/(\d{5,30})/)?.[1] ??
    null
  );
}

function extractMedia(description, feedUrl, validateUrl) {
  const media = [];
  const seen = new Set();
  const tagPattern = /<(img|source|video)\b[^>]*\b(src|poster)=(?:"([^"]+)"|'([^']+)')[^>]*>/gi;
  let match;

  while ((match = tagPattern.exec(String(description ?? "")))) {
    const rawUrl = match[3] ?? match[4];
    try {
      const url = new URL(rawUrl, feedUrl);
      validateUrl(url);
      if (seen.has(url.href)) {
        continue;
      }
      seen.add(url.href);
      media.push({
        kind:
          match[1].toLowerCase() === "img" ||
          match[2].toLowerCase() === "poster"
            ? "image"
            : "video",
        url: url.href,
      });
    } catch {
      // An untrusted media URL is omitted instead of being exposed downstream.
    }
  }
  return media;
}

function channelMatchesHandle(channel, handle, feedUrl) {
  const expected = handle.toLowerCase();
  const title = stringValue(channel.title).toLowerCase();
  if (title.includes(`@${expected}`)) {
    return true;
  }

  for (const rawLink of asArray(channel.link)) {
    try {
      const link = new URL(stringValue(rawLink), feedUrl);
      const firstPathPart = decodeURIComponent(
        link.pathname.split("/").filter(Boolean)[0] ?? "",
      ).toLowerCase();
      if (firstPathPart === expected) {
        return true;
      }
    } catch {
      // Try the remaining channel identity evidence.
    }
  }
  return false;
}

/**
 * Parse and semantically validate one Nitter RSS document.
 *
 * Candidates deliberately expose canonical x.com links instead of mirror links.
 * The feed URL and every retained media URL must already have passed the
 * transport's HTTPS/allowlist validation.
 */
export function parseNitterRss(
  xml,
  sourceValue,
  {
    feedUrl,
    instanceHost,
    validateUrl = () => {},
    discoveredAt = new Date(),
  } = {},
) {
  const source = normalizeSource(sourceValue);
  const document = String(xml ?? "").trim();
  if (!document) {
    throw new NitterTransportError("Nitter returned an empty RSS document.", {
      code: "EMPTY_RSS",
      instanceHost,
    });
  }
  if (/<!DOCTYPE|<!ENTITY/i.test(document)) {
    throw new NitterTransportError(
      "Nitter RSS contained a prohibited document declaration.",
      { code: "UNSAFE_XML", instanceHost },
    );
  }
  if (/^<!doctype\s+html|^<html\b/i.test(document)) {
    throw new NitterTransportError(
      "Nitter returned HTML instead of an RSS document.",
      { code: "HTML_INSTEAD_OF_RSS", instanceHost },
    );
  }

  const validation = XMLValidator.validate(document);
  if (validation !== true) {
    throw new NitterTransportError(
      "Nitter returned malformed XML instead of a valid RSS document.",
      { code: "MALFORMED_RSS", instanceHost },
    );
  }

  let parsed;
  try {
    parsed = rssParser.parse(document);
  } catch (cause) {
    throw new NitterTransportError("Nitter RSS parsing failed.", {
      code: "MALFORMED_RSS",
      cause,
      instanceHost,
    });
  }

  const channel = parsed?.rss?.channel;
  if (!channel || typeof channel !== "object") {
    throw new NitterTransportError(
      "Nitter response did not contain an RSS channel.",
      { code: "INVALID_RSS_CHANNEL", instanceHost },
    );
  }
  if (!channelMatchesHandle(channel, source.handle, feedUrl)) {
    throw new NitterTransportError(
      "Nitter RSS channel did not match the requested X account.",
      { code: "RSS_IDENTITY_MISMATCH", instanceHost },
    );
  }

  const rawItems = asArray(channel.item);
  const candidates = [];
  const seenIds = new Set();
  let invalidItemCount = 0;
  const discoveryDate =
    discoveredAt instanceof Date ? discoveredAt : new Date(discoveredAt);
  const discoveredIso = Number.isFinite(discoveryDate.getTime())
    ? discoveryDate.toISOString()
    : new Date().toISOString();

  for (const item of rawItems) {
    const rawLink = stringValue(item?.link).trim();
    const statusId = extractStatusId(item?.guid, rawLink);
    const publishedDate = new Date(stringValue(item?.pubDate));
    if (!statusId || !Number.isFinite(publishedDate.getTime())) {
      invalidItemCount += 1;
      continue;
    }

    if (rawLink) {
      try {
        const itemUrl = new URL(rawLink, feedUrl);
        validateUrl(itemUrl);
        if (!new RegExp(`/status/${statusId}(?:/|$)`).test(itemUrl.pathname)) {
          invalidItemCount += 1;
          continue;
        }
      } catch {
        invalidItemCount += 1;
        continue;
      }
    }

    if (seenIds.has(statusId)) {
      continue;
    }
    seenIds.add(statusId);

    const description = stringValue(item?.description);
    const title = stringValue(item?.title).trim();
    const text = title || stripMarkup(description);
    const canonicalUrl =
      `https://x.com/${source.handle}/status/${statusId}`;
    const candidateId = `x:${statusId}`;
    const publishedAt = publishedDate.toISOString();
    candidates.push({
      schemaVersion: 1,
      id: candidateId,
      candidateId,
      eventId: statusId,
      versionId: candidateId,
      eventType: "social-post",
      type: "social_post",
      platform: "x",
      sourceKey: source.key,
      source: {
        key: source.key,
        label: source.label,
        kind: "social",
        platform: "x",
        handle: source.handle,
      },
      statusId,
      author: stringValue(item?.creator).trim() || `@${source.handle}`,
      title: text,
      summary: text,
      text,
      publishedAt,
      updatedAt: publishedAt,
      discoveredAt: discoveredIso,
      url: canonicalUrl,
      canonicalUrl,
      media: extractMedia(description, feedUrl, validateUrl),
      transport: {
        kind: "nitter-rss",
        instanceHost,
      },
    });
  }

  if (rawItems.length > 0 && candidates.length === 0 && invalidItemCount > 0) {
    throw new NitterTransportError(
      "Nitter RSS contained items but none were valid status entries.",
      { code: "INVALID_RSS_ITEMS", instanceHost },
    );
  }

  return candidates.sort(
    (left, right) =>
      Date.parse(left.publishedAt) - Date.parse(right.publishedAt),
  );
}

function parseRetryAfter(value, nowMs) {
  if (!value) {
    return null;
  }
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.round(seconds * 1_000);
  }
  const at = Date.parse(value);
  return Number.isFinite(at) ? Math.max(0, at - nowMs) : null;
}

async function discardResponseBody(response) {
  try {
    await response.body?.cancel();
  } catch {
    // The response is already unusable; cancellation is best effort.
  }
}

async function readTextWithLimit(response, maximumBytes, instanceHost) {
  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maximumBytes) {
    await discardResponseBody(response);
    throw new NitterTransportError(
      `Nitter RSS exceeded the ${maximumBytes}-byte response limit.`,
      { code: "RSS_TOO_LARGE", instanceHost },
    );
  }

  if (!response.body?.getReader) {
    const buffer = new Uint8Array(await response.arrayBuffer());
    if (buffer.byteLength > maximumBytes) {
      throw new NitterTransportError(
        `Nitter RSS exceeded the ${maximumBytes}-byte response limit.`,
        { code: "RSS_TOO_LARGE", instanceHost },
      );
    }
    return new TextDecoder().decode(buffer);
  }

  const reader = response.body.getReader();
  const chunks = [];
  let byteLength = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      byteLength += value.byteLength;
      if (byteLength > maximumBytes) {
        await reader.cancel();
        throw new NitterTransportError(
          `Nitter RSS exceeded the ${maximumBytes}-byte response limit.`,
          { code: "RSS_TOO_LARGE", instanceHost },
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const joined = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(joined);
}

function publicErrorSummary(error) {
  const code = String(error?.code ?? "UNKNOWN_ERROR")
    .replace(/[^A-Z0-9_]/gi, "")
    .slice(0, 50);
  const message = String(error?.message ?? "Unknown failure")
    .replace(/[\r\n\t]+/g, " ")
    .slice(0, 220);
  return `${code}: ${message}`;
}

/**
 * Credential-free, failover-aware Nitter RSS client.
 *
 * It never accepts cookies, tokens, passwords, or arbitrary request headers.
 * Feeds are constructed solely from an allowlisted instance and validated handle.
 */
export class NitterRssTransport {
  constructor({
    instances,
    allowedHosts,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxResponseBytes = DEFAULT_MAX_RESPONSE_BYTES,
    maxRedirects = DEFAULT_MAX_REDIRECTS,
    failureThreshold = DEFAULT_FAILURE_THRESHOLD,
    baseBackoffMs = DEFAULT_BASE_BACKOFF_MS,
    maxBackoffMs = DEFAULT_MAX_BACKOFF_MS,
    userAgent = DEFAULT_USER_AGENT,
    fetchImpl = globalThis.fetch,
    now = Date.now,
  } = {}) {
    if (!Array.isArray(instances) || instances.length === 0) {
      throw new TypeError(
        "NitterRssTransport requires at least one HTTPS instance.",
      );
    }
    if (typeof fetchImpl !== "function") {
      throw new TypeError("A Fetch-compatible implementation is required.");
    }
    if (typeof now !== "function") {
      throw new TypeError("now must be a function.");
    }

    this.timeoutMs = requireInteger(timeoutMs, "timeoutMs", 1);
    this.maxResponseBytes = requireInteger(
      maxResponseBytes,
      "maxResponseBytes",
      256,
    );
    this.maxRedirects = requireInteger(maxRedirects, "maxRedirects", 0);
    this.failureThreshold = requireInteger(
      failureThreshold,
      "failureThreshold",
      1,
    );
    this.baseBackoffMs = requireInteger(
      baseBackoffMs,
      "baseBackoffMs",
      1,
    );
    this.maxBackoffMs = requireInteger(
      maxBackoffMs,
      "maxBackoffMs",
      this.baseBackoffMs,
    );
    this.fetchImpl = fetchImpl;
    this.now = now;
    this.userAgent = String(userAgent).trim();
    if (
      !this.userAgent ||
      this.userAgent.length > 200 ||
      /[\r\n]/.test(this.userAgent)
    ) {
      throw new TypeError("userAgent must be a safe, non-empty header value.");
    }

    const parsedInstances = instances.map(normalizeInstanceUrl);
    const derivedHosts = parsedInstances.map((url) =>
      url.hostname.toLowerCase(),
    );
    this.allowedHosts = new Set(
      (allowedHosts ?? derivedHosts).map(normalizeAllowedHost),
    );
    this.allowedOrigins = new Set(parsedInstances.map((url) => url.origin));

    const duplicateCheck = new Set();
    this.instances = parsedInstances.map((url) => {
      if (!this.allowedHosts.has(url.hostname.toLowerCase())) {
        throw new TypeError(
          `Nitter instance host is not allowlisted: ${url.hostname}`,
        );
      }
      if (duplicateCheck.has(url.href)) {
        throw new TypeError(`Duplicate Nitter instance: ${url.href}`);
      }
      duplicateCheck.add(url.href);
      return {
        baseUrl: url,
        host: url.hostname.toLowerCase(),
        consecutiveFailures: 0,
        openCount: 0,
        nextAttemptAtMs: null,
        totalAttempts: 0,
        totalSuccesses: 0,
        totalFailures: 0,
        healthFailures: 0,
        lastAttemptAtMs: null,
        lastSuccessAtMs: null,
        lastFailureAtMs: null,
        lastError: null,
      };
    });
    this.cursor = 0;
  }

  _validateTransportUrl(value) {
    const url = value instanceof URL ? value : new URL(String(value));
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      !this.allowedHosts.has(url.hostname.toLowerCase()) ||
      !this.allowedOrigins.has(url.origin)
    ) {
      throw new NitterTransportError(
        "Nitter attempted to use a non-allowlisted HTTPS URL.",
        {
          code: "UNSAFE_NITTER_URL",
          instanceHost: url.hostname || null,
        },
      );
    }
    return url;
  }

  _stateAt(instance, nowMs) {
    if (instance.nextAttemptAtMs === null) {
      return "closed";
    }
    return instance.nextAttemptAtMs <= nowMs ? "half-open" : "open";
  }

  _orderedEligibleInstances(nowMs) {
    const halfOpen = [];
    const closed = [];
    for (const instance of this.instances) {
      const state = this._stateAt(instance, nowMs);
      if (state === "half-open") {
        halfOpen.push(instance);
      } else if (state === "closed") {
        closed.push(instance);
      }
    }

    if (closed.length > 1) {
      const offset = this.cursor % closed.length;
      closed.push(...closed.splice(0, offset));
    }
    return [...halfOpen, ...closed];
  }

  _markSuccess(instance, nowMs) {
    instance.totalSuccesses += 1;
    instance.lastSuccessAtMs = nowMs;
    instance.consecutiveFailures = 0;
    instance.openCount = 0;
    instance.nextAttemptAtMs = null;
    instance.lastError = null;
    this.cursor = (this.instances.indexOf(instance) + 1) % this.instances.length;
  }

  _markFailure(instance, error, nowMs, wasHalfOpen) {
    instance.totalFailures += 1;
    instance.lastFailureAtMs = nowMs;
    instance.lastError = publicErrorSummary(error);
    if (error.affectsHealth === false) {
      return;
    }

    instance.healthFailures += 1;
    instance.consecutiveFailures += 1;
    if (
      !wasHalfOpen &&
      instance.consecutiveFailures < this.failureThreshold
    ) {
      return;
    }

    instance.openCount += 1;
    const exponentialDelay = Math.min(
      this.maxBackoffMs,
      this.baseBackoffMs * 2 ** Math.max(0, instance.openCount - 1),
    );
    const delay = Math.min(
      this.maxBackoffMs,
      Math.max(exponentialDelay, error.retryAfterMs ?? 0),
    );
    instance.nextAttemptAtMs = nowMs + delay;
  }

  _feedUrl(instance, source) {
    const url = new URL(
      `${encodeURIComponent(source.handle)}/rss`,
      instance.baseUrl,
    );
    return this._validateTransportUrl(url);
  }

  async _requestFeed(instance, source) {
    const instanceHost = instance.host;
    let currentUrl = this._feedUrl(instance, source);
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
    }, this.timeoutMs);

    try {
      for (
        let redirectCount = 0;
        redirectCount <= this.maxRedirects;
        redirectCount += 1
      ) {
        let response;
        try {
          response = await this.fetchImpl(currentUrl, {
            method: "GET",
            headers: {
              Accept:
                "application/rss+xml, application/xml;q=0.9, text/xml;q=0.8",
              "User-Agent": this.userAgent,
            },
            redirect: "manual",
            credentials: "omit",
            cache: "no-store",
            signal: controller.signal,
          });
        } catch (cause) {
          if (controller.signal.aborted) {
            throw new NitterTransportError(
              `Nitter RSS request timed out after ${this.timeoutMs}ms.`,
              { code: "NITTER_TIMEOUT", cause, instanceHost },
            );
          }
          throw new NitterTransportError("Nitter RSS request failed.", {
            code: "NITTER_NETWORK_ERROR",
            cause,
            instanceHost,
          });
        }

        const status = Number(response.status ?? 0);
        if (REDIRECT_STATUSES.has(status)) {
          if (redirectCount >= this.maxRedirects) {
            await discardResponseBody(response);
            throw new NitterTransportError(
              "Nitter exceeded the redirect limit.",
              { code: "TOO_MANY_REDIRECTS", instanceHost },
            );
          }
          const location = response.headers.get("location");
          await discardResponseBody(response);
          if (!location) {
            throw new NitterTransportError(
              "Nitter returned a redirect without a destination.",
              { code: "INVALID_REDIRECT", instanceHost },
            );
          }
          let redirected;
          try {
            redirected = new URL(location, currentUrl);
          } catch (cause) {
            throw new NitterTransportError(
              "Nitter returned an invalid redirect destination.",
              {
                code: "INVALID_REDIRECT",
                cause,
                instanceHost,
              },
            );
          }
          currentUrl = this._validateTransportUrl(redirected);
          continue;
        }

        if (status < 200 || status >= 300) {
          await discardResponseBody(response);
          const sourceSpecific = status === 404 || status === 410;
          throw new NitterTransportError(
            `Nitter returned HTTP ${status}.`,
            {
              code: `NITTER_HTTP_${status}`,
              affectsHealth: !sourceSpecific,
              instanceHost,
              retryAfterMs:
                status === 429
                  ? parseRetryAfter(
                      response.headers.get("retry-after"),
                      this.now(),
                    )
                  : null,
            },
          );
        }

        const contentType = String(
          response.headers.get("content-type") ?? "",
        ).toLowerCase();
        if (
          contentType.includes("text/html") ||
          (contentType &&
            !XML_CONTENT_TYPES.some((type) => contentType.includes(type)))
        ) {
          await discardResponseBody(response);
          throw new NitterTransportError(
            "Nitter returned a non-RSS content type.",
            { code: "INVALID_RSS_CONTENT_TYPE", instanceHost },
          );
        }

        const body = await readTextWithLimit(
          response,
          this.maxResponseBytes,
          instanceHost,
        );
        return parseNitterRss(body, source, {
          feedUrl: currentUrl,
          instanceHost,
          validateUrl: (url) => this._validateTransportUrl(url),
          discoveredAt: new Date(this.now()),
        });
      }
    } finally {
      clearTimeout(timer);
    }

    throw new NitterTransportError("Nitter redirect handling failed.", {
      code: "INVALID_REDIRECT",
      instanceHost,
    });
  }

  async fetchTimeline(sourceValue) {
    const source = normalizeSource(sourceValue);
    const startedAt = this.now();
    const eligible = this._orderedEligibleInstances(startedAt);
    if (eligible.length === 0) {
      const retryAtMs = Math.min(
        ...this.instances
          .map((instance) => instance.nextAttemptAtMs)
          .filter(Number.isFinite),
      );
      const health = this.healthSnapshot();
      throw new NitterPoolError(
        [],
        "Every Nitter instance circuit is currently open.",
        {
          code: "NITTER_CIRCUITS_OPEN",
          retryAt: Number.isFinite(retryAtMs)
            ? new Date(retryAtMs).toISOString()
            : null,
          health,
        },
      );
    }

    const errors = [];
    for (const instance of eligible) {
      const attemptAt = this.now();
      const wasHalfOpen = this._stateAt(instance, attemptAt) === "half-open";
      instance.totalAttempts += 1;
      instance.lastAttemptAtMs = attemptAt;
      try {
        const candidates = await this._requestFeed(instance, source);
        this._markSuccess(instance, this.now());
        return candidates;
      } catch (cause) {
        const error =
          cause instanceof NitterTransportError
            ? cause
            : new NitterTransportError("Unexpected Nitter transport failure.", {
                cause,
                instanceHost: instance.host,
              });
        this._markFailure(instance, error, this.now(), wasHalfOpen);
        errors.push(error);
      }
    }

    const health = this.healthSnapshot();
    const retryTimes = this.instances
      .map((instance) => instance.nextAttemptAtMs)
      .filter(Number.isFinite);
    const retryAtMs =
      retryTimes.length > 0 ? Math.min(...retryTimes) : null;
    throw new NitterPoolError(
      errors,
      "No configured Nitter instance returned a usable RSS feed.",
      {
        retryAt:
          retryAtMs === null ? null : new Date(retryAtMs).toISOString(),
        health,
      },
    );
  }

  healthSnapshot() {
    const nowMs = this.now();
    const instances = this.instances.map((instance) => ({
      baseUrl: instance.baseUrl.href,
      host: instance.host,
      state: this._stateAt(instance, nowMs),
      consecutiveFailures: instance.consecutiveFailures,
      totalAttempts: instance.totalAttempts,
      totalSuccesses: instance.totalSuccesses,
      totalFailures: instance.totalFailures,
      healthFailures: instance.healthFailures,
      lastAttemptAt:
        instance.lastAttemptAtMs === null
          ? null
          : new Date(instance.lastAttemptAtMs).toISOString(),
      lastSuccessAt:
        instance.lastSuccessAtMs === null
          ? null
          : new Date(instance.lastSuccessAtMs).toISOString(),
      lastFailureAt:
        instance.lastFailureAtMs === null
          ? null
          : new Date(instance.lastFailureAtMs).toISOString(),
      nextAttemptAt:
        instance.nextAttemptAtMs === null
          ? null
          : new Date(instance.nextAttemptAtMs).toISOString(),
      lastError: instance.lastError,
    }));
    return {
      generatedAt: new Date(nowMs).toISOString(),
      status:
        instances.every((instance) => instance.state === "open")
          ? "unavailable"
          : instances.some(
                (instance) =>
                  instance.state !== "closed" ||
                  instance.consecutiveFailures > 0,
              )
            ? "degraded"
            : "healthy",
      availableInstances: instances.filter(
        (instance) => instance.state !== "open",
      ).length,
      instances,
    };
  }
}

export function createNitterTransport(options) {
  return new NitterRssTransport(options);
}
