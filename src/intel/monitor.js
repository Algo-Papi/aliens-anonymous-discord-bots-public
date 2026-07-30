import {
  EARTH_INTEL_REGISTRY_MARKER,
  buildEarthIntelPayload,
  buildEarthIntelRegistryPayload,
  buildEarthIntelTestPayload,
  buildEarthIntelUpdatePayload,
  buildIntelHealthNotification,
  earthIntelThreadName,
} from "./discord.js";
import { classifyCandidate } from "./classifier.js";
import {
  EARTH_INTEL_RUNTIME_SOURCES,
} from "./runtime-sources.js";
import {
  EVIDENCE_QUALITIES,
  PUBLICATION_MODES,
  evaluatePublication,
  getIntelSource,
  shouldClusterStories,
  storyFingerprint,
} from "./index.js";

const RECENT_STORY_WINDOW_MS = 36 * 60 * 60 * 1_000;
const SOURCE_FAILURE_NOTIFY_THRESHOLD = 2;
const INCIDENT_REMINDER_MS = 2 * 60 * 60 * 1_000;
const DEFAULT_THREAD_ARCHIVE_MINUTES = 1_440;

function timestamp(value, fallback = Date.now()) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  const parsed = Date.parse(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function midnightLocal(now) {
  const date = new Date(now);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function itemId(candidate) {
  return candidate.versionId ?? candidate.id;
}

export function isIntelSourceDue(source, state, now = Date.now()) {
  if (state?.nextAttemptAt && state.nextAttemptAt > now) {
    return false;
  }
  return (
    !state?.lastAttemptAt ||
    now - state.lastAttemptAt >= source.intervalMs
  );
}

export function enrichIntelCandidate(candidate, runtimeSource) {
  const registry = getIntelSource(runtimeSource.key);
  return Object.freeze({
    ...candidate,
    sourceKey: runtimeSource.key,
    source: Object.freeze({
      ...(candidate.source ?? {}),
      key: runtimeSource.key,
      label: candidate.source?.label ?? runtimeSource.label,
      family: registry?.family ?? runtimeSource.key,
      lane: registry?.lane ?? null,
      evidenceQuality:
        registry?.evidenceQuality ?? EVIDENCE_QUALITIES.MEDIUM,
    }),
  });
}

function evidenceFor(candidate) {
  return Object.freeze({
    sourceKey: candidate.source.key,
    originFamily: candidate.source.family,
    quality: candidate.source.evidenceQuality,
    official:
      candidate.evidence?.official === true ||
      candidate.source.kind === "official",
    position: "supports",
  });
}

function mergeEvidence(existing, observation) {
  const keyed = new Map();
  for (const entry of [...(existing ?? []), observation]) {
    const key = [
      entry.sourceKey,
      entry.originFamily,
      entry.position ?? "supports",
    ].join("|");
    keyed.set(key, entry);
  }
  return [...keyed.values()];
}

function sourceFamilies(evidence) {
  return [...new Set(evidence.map((entry) => entry.originFamily))].sort();
}

function mostRecentPublishedAt(candidates) {
  if (candidates.length === 0) {
    return null;
  }
  return Math.max(
    ...candidates.map((candidate) => timestamp(candidate.publishedAt, 0)),
  );
}

function sanitizedError(error) {
  return String(error?.message ?? error ?? "Unknown failure")
    .replace(/[\r\n\t]+/g, " ")
    .slice(0, 500);
}

export class EarthIntelMonitor {
  constructor({
    client,
    config,
    store,
    nitterTransport,
    sources = EARTH_INTEL_RUNTIME_SOURCES,
    logInfo = () => {},
    logError = () => {},
    now = Date.now,
  }) {
    this.client = client;
    this.config = config;
    this.store = store;
    this.nitterTransport = nitterTransport;
    this.sources = sources;
    this.logInfo = logInfo;
    this.logError = logError;
    this.now = now;
    this.channel = null;
    this.timer = null;
    this.pollInFlight = false;
    this.recoveryStreak = new Map();
  }

  async resolveChannel() {
    if (this.channel) {
      return this.channel;
    }
    const channel = await this.client.channels.fetch(
      this.config.earthIntelChannelId,
    );
    if (
      !channel?.isTextBased() ||
      !("send" in channel) ||
      !("messages" in channel)
    ) {
      throw new Error(
        "The configured Earth Intel channel is not a sendable text channel.",
      );
    }
    this.channel = channel;
    return channel;
  }

  async start() {
    if (!this.config.earthIntelEnabled) {
      return;
    }
    this.store.recoverInterruptedOutbox(this.now());
    await this.resolveChannel();
    await this.ensureRegistryMessage();
    await this.pollNow();
    this.timer = setInterval(() => {
      void this.pollNow().catch((error) => {
        this.logError("Earth Intel scheduled poll failed", error);
      });
    }, this.config.earthIntelSchedulerIntervalMs);
    this.timer.unref?.();
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async fetchSource(source, state) {
    if (source.kind === "social") {
      return {
        candidates: await this.nitterTransport.fetchTimeline(source),
        validators: {},
        notModified: false,
      };
    }
    return source.fetchCandidates({
      validators: {
        etag: state?.etag ?? null,
        lastModified: state?.lastModified ?? null,
      },
    });
  }

  async pollSource(source) {
    const attemptedAt = this.now();
    const previousState = this.store.getSourceState(source.key);
    if (!isIntelSourceDue(source, previousState, attemptedAt)) {
      return { source, attempted: false, success: true };
    }

    try {
      const result = await this.fetchSource(source, previousState);
      const candidates = (result.candidates ?? []).map((candidate) =>
        enrichIntelCandidate(candidate, source),
      );
      const stateChange = this.store.markSourceSuccess({
        sourceKey: source.key,
        attemptedAt,
        lastItemAt: mostRecentPublishedAt(candidates),
        etag: result.validators?.etag ?? null,
        lastModified: result.validators?.lastModified ?? null,
      });

      if (!this.store.isSourceInitialized(source.key)) {
        this.store.initializeSource(source.key, candidates, attemptedAt);
        this.logInfo("Earth Intel source initialized without backfill", {
          sourceKey: source.key,
          itemCount: candidates.length,
        });
      } else if (!result.notModified) {
        const unseen = candidates.filter(
          (candidate) =>
            !this.store.hasCandidate(source.key, itemId(candidate)),
        );
        const maximum =
          this.config.earthIntelMaxItemsPerSourcePerCycle;
        const sendable = unseen.slice(-maximum);
        const suppressed = unseen.slice(0, -sendable.length);
        for (const candidate of suppressed) {
          this.store.saveCandidate({
            candidate,
            status: "suppressed",
            suppressionReason: "recovery_cap",
            discoveredAt: attemptedAt,
          });
        }
        for (const candidate of sendable) {
          await this.processCandidate(candidate, attemptedAt);
        }
      }

      await this.handleSourceRecovery(
        source,
        stateChange.previous,
        attemptedAt,
      );
      return {
        source,
        attempted: true,
        success: true,
        candidateCount: candidates.length,
      };
    } catch (error) {
      const failureCount =
        (previousState?.consecutiveFailures ?? 0) + 1;
      const backoffMs = Math.min(
        15 * 60_000,
        30_000 * 2 ** Math.max(0, failureCount - 1),
      );
      const nextAttemptAt =
        timestamp(error?.retryAt, attemptedAt + backoffMs) ||
        attemptedAt + backoffMs;
      const state = this.store.markSourceFailure({
        sourceKey: source.key,
        error,
        attemptedAt,
        circuitState: "open",
        nextAttemptAt,
      });
      this.logError("Earth Intel source poll failed", error, {
        sourceKey: source.key,
        consecutiveFailures: state.consecutiveFailures,
        nextAttemptAt,
      });
      if (state.consecutiveFailures >= SOURCE_FAILURE_NOTIFY_THRESHOLD) {
        await this.notifySourceFailure(source, state, error);
      }
      return {
        source,
        attempted: true,
        success: false,
        error,
      };
    }
  }

  findMatchingStory(classification) {
    const directKey = storyFingerprint(classification);
    const direct = this.store.getStory(directKey);
    if (direct) {
      return direct;
    }
    const since = this.now() - RECENT_STORY_WINDOW_MS;
    return (
      this.store.getRecentStories(since, 100).find((story) =>
        shouldClusterStories(
          classification,
          {
            title: story.title,
            entities: story.fingerprint,
            publishedAt: new Date(story.lastCandidateAt).toISOString(),
          },
          {
            maximumTimeDistanceMs: RECENT_STORY_WINDOW_MS,
            minimumSimilarity: 0.58,
          },
        ),
      ) ?? null
    );
  }

  async processCandidate(candidate, discoveredAt = this.now()) {
    const classification = classifyCandidate(candidate);
    const existingStory = this.findMatchingStory(classification);
    const registry = getIntelSource(candidate.source.key);
    if (
      registry?.publicationMode === PUBLICATION_MODES.CORROBORATION_ONLY &&
      !existingStory
    ) {
      this.store.saveCandidate({
        candidate,
        status: "suppressed",
        suppressionReason: "corroboration_only",
        discoveredAt,
      });
      return;
    }

    const evidence = mergeEvidence(
      existingStory?.evidence,
      evidenceFor(candidate),
    );
    const publishedToday = this.store.countPublishedSince(
      midnightLocal(discoveredAt),
    );
    const decision = evaluatePublication({
      story: classification,
      evidence,
      publishedToday,
      isExistingStoryUpdate: Boolean(existingStory),
      policy: {
        softDailyCap: this.config.earthIntelDailySoftCap,
      },
    });
    const computedStoryKey =
      existingStory?.storyKey ?? storyFingerprint(classification);
    if (!decision.allowed) {
      this.store.saveCandidate({
        candidate,
        storyKey: computedStoryKey,
        status: "suppressed",
        suppressionReason: decision.code,
        discoveredAt,
      });
      this.logInfo("Earth Intel candidate suppressed", {
        sourceKey: candidate.source.key,
        itemId: itemId(candidate),
        reason: decision.code,
        significance: classification.significance,
      });
      return;
    }

    this.store.saveCandidate({
      candidate,
      storyKey: computedStoryKey,
      status: "queued",
      discoveredAt,
    });
    this.store.queueOutbox({
      sourceKey: candidate.source.key,
      itemId: itemId(candidate),
      storyKey: computedStoryKey,
      action: existingStory ? "update" : "create",
      payload: {
        candidate,
        classification,
        decision,
        evidence,
        sourceFamilies: sourceFamilies(evidence),
        existingStory,
      },
      createdAt: discoveredAt,
    });
  }

  async findExistingDiscordDelivery(entry, channel) {
    const targetUrl =
      entry.payload.candidate?.canonicalUrl ??
      entry.payload.candidate?.url;
    if (!targetUrl || entry.attempts === 0) {
      return null;
    }
    if (entry.action === "update") {
      const story = this.store.getStory(entry.storyKey);
      if (!story?.discordThreadId) {
        return null;
      }
      try {
        const thread = await this.client.channels.fetch(
          story.discordThreadId,
        );
        const messages = await thread.messages.fetch({ limit: 50 });
        return (
          [...messages.values()].find((message) =>
            message.embeds.some((embed) => embed.url === targetUrl),
          ) ?? null
        );
      } catch {
        return null;
      }
    }
    try {
      const messages = await channel.messages.fetch({ limit: 100 });
      return (
        [...messages.values()].find((message) =>
          message.embeds.some((embed) => embed.url === targetUrl),
        ) ?? null
      );
    } catch {
      return null;
    }
  }

  async ensureDiscussionThread(message, title) {
    if (message.thread) {
      return message.thread;
    }
    if (message.hasThread) {
      try {
        return await this.client.channels.fetch(message.thread?.id);
      } catch {
        // Attempt to create a replacement below.
      }
    }
    try {
      return await message.startThread({
        name: earthIntelThreadName(title),
        autoArchiveDuration: DEFAULT_THREAD_ARCHIVE_MINUTES,
        reason: "Earth Intel public discussion thread",
      });
    } catch (error) {
      this.logError("Earth Intel discussion thread creation failed", error, {
        messageId: message.id,
        channelId: message.channelId,
      });
      await this.notifyOperational({
        incidentKey: "discord:earth-intel-thread-permission",
        severity: "warning",
        title: "Earth Intel cannot create discussion threads",
        description:
          "Alerts can post, but members cannot receive the planned per-story discussion thread until Agent K has Create Public Threads and Send Messages in Threads in #earth-intel.",
        details: [sanitizedError(error)],
      });
      return null;
    }
  }

  async deliverCreate(entry, channel) {
    const { candidate, decision, evidence, sourceFamilies: families } =
      entry.payload;
    const existing = await this.findExistingDiscordDelivery(entry, channel);
    const message =
      existing ??
      (await channel.send(
        await buildEarthIntelPayload({
          candidate,
          decision,
          supportFamilyCount:
            decision.reliability.supportFamilyCount ??
            families.length ??
            1,
        }),
      ));
    const thread = await this.ensureDiscussionThread(
      message,
      candidate.title,
    );
    const now = this.now();
    this.store.upsertStory({
      storyKey: entry.storyKey,
      title: candidate.title,
      fingerprint: entry.payload.classification.entities,
      reliability: decision.reliability.label,
      sourceFamilies: families,
      evidence,
      discordChannelId: channel.id,
      discordMessageId: message.id,
      discordThreadId: thread?.id ?? null,
      createdAt: entry.createdAt,
      updatedAt: now,
      lastCandidateAt: timestamp(candidate.publishedAt, now),
    });
    this.store.updateCandidateDelivery({
      sourceKey: entry.sourceKey,
      itemId: entry.itemId,
      status: "published",
      discordMessageId: message.id,
      discordThreadId: thread?.id ?? null,
    });
    return message.id;
  }

  async deliverUpdate(entry) {
    const story = this.store.getStory(entry.storyKey);
    if (!story) {
      throw new Error("Earth Intel update has no persisted parent story.");
    }
    let thread = story.discordThreadId
      ? await this.client.channels.fetch(story.discordThreadId).catch(() => null)
      : null;
    if (!thread) {
      const channel = await this.resolveChannel();
      const parent = await channel.messages.fetch(story.discordMessageId);
      thread = await this.ensureDiscussionThread(
        parent,
        entry.payload.candidate.title,
      );
    }
    if (!thread?.isTextBased() || !("send" in thread)) {
      throw new Error("Earth Intel story thread is unavailable.");
    }

    const { candidate, decision, evidence, sourceFamilies: families } =
      entry.payload;
    const existing = await this.findExistingDiscordDelivery(
      entry,
      await this.resolveChannel(),
    );
    const updateMessage =
      existing ??
      (await thread.send(
        buildEarthIntelUpdatePayload({
          candidate,
          decision,
          supportFamilyCount:
            decision.reliability.supportFamilyCount ??
            families.length ??
            1,
        }),
      ));
    const now = this.now();
    this.store.upsertStory({
      ...story,
      title: candidate.title,
      fingerprint: entry.payload.classification.entities,
      reliability: decision.reliability.label,
      sourceFamilies: families,
      evidence,
      discordThreadId: thread.id,
      updatedAt: now,
      lastCandidateAt: timestamp(candidate.publishedAt, now),
    });
    this.store.updateCandidateDelivery({
      sourceKey: entry.sourceKey,
      itemId: entry.itemId,
      status: "published-update",
      discordMessageId: story.discordMessageId,
      discordThreadId: thread.id,
    });
    return updateMessage.id;
  }

  async drainOutbox() {
    const channel = await this.resolveChannel();
    for (const entry of this.store.getPendingOutbox(25)) {
      if (!this.store.markOutboxSending(entry.id, this.now())) {
        continue;
      }
      try {
        const deliveredMessageId =
          entry.action === "create"
            ? await this.deliverCreate(entry, channel)
            : await this.deliverUpdate(entry);
        this.store.markOutboxSent(
          entry.id,
          deliveredMessageId,
          this.now(),
        );
        this.logInfo("Earth Intel delivery completed", {
          action: entry.action,
          sourceKey: entry.sourceKey,
          itemId: entry.itemId,
          storyKey: entry.storyKey,
          deliveredMessageId,
        });
      } catch (error) {
        this.store.markOutboxFailed(entry.id, error, this.now());
        this.logError("Earth Intel delivery failed", error, {
          action: entry.action,
          sourceKey: entry.sourceKey,
          itemId: entry.itemId,
          storyKey: entry.storyKey,
        });
        await this.notifyOperational({
          incidentKey: "discord:earth-intel-delivery",
          severity: "critical",
          title: "Earth Intel cannot deliver alerts",
          description:
            "Agent K discovered a qualifying report but could not post it to #earth-intel. The outbox retained it for a safe retry.",
          details: [sanitizedError(error)],
        });
      }
    }
  }

  async pollNow() {
    if (!this.config.earthIntelEnabled || this.pollInFlight) {
      return;
    }
    this.pollInFlight = true;
    try {
      const results = [];
      for (const source of this.sources) {
        results.push(await this.pollSource(source));
      }
      await this.drainOutbox();
      await this.evaluateNitterPoolIncident(results);
    } finally {
      this.pollInFlight = false;
    }
  }

  async ensureRegistryMessage() {
    const channel = await this.resolveChannel();
    const payload = buildEarthIntelRegistryPayload(this.sources);
    let pinned;
    try {
      const pins = await channel.messages.fetchPins();
      pinned = pins.items.map((item) => item.message).find((message) =>
        message.embeds.some((embed) =>
          embed.footer?.text?.includes(EARTH_INTEL_REGISTRY_MARKER),
        ),
      );
    } catch {
      pinned = null;
    }
    if (pinned) {
      await pinned.edit(payload);
      return pinned;
    }
    const message = await channel.send(payload);
    try {
      await message.pin("Canonical Earth Intel source registry");
    } catch (error) {
      this.logError("Earth Intel registry could not be pinned", error, {
        channelId: channel.id,
        registryMessageId: message.id,
      });
      await this.notifyOperational({
        incidentKey: "discord:earth-intel-pin-permission",
        severity: "warning",
        title: "Earth Intel source registry could not be pinned",
        description:
          "The source registry was posted, but Agent K needs Manage Messages in #earth-intel to keep it pinned automatically.",
        details: [sanitizedError(error)],
      });
    }
    return message;
  }

  async postSystemTest() {
    const channel = await this.resolveChannel();
    const message = await channel.send(buildEarthIntelTestPayload());
    const thread = await this.ensureDiscussionThread(
      message,
      "Earth Intel system test",
    );
    if (thread) {
      await thread.send({
        content:
          "✅ Test discussion thread opened successfully. Future real alerts will keep follow-up reporting and member comments here.",
        allowedMentions: { parse: [] },
      });
    }
    return { messageId: message.id, threadId: thread?.id ?? null };
  }

  async notifyOwner(payload) {
    const guild = await this.client.guilds.fetch(this.config.guildId);
    const ownerId = this.config.earthIntelOwnerUserId || guild.ownerId;
    try {
      const owner = await this.client.users.fetch(ownerId);
      await owner.send(payload);
      return "dm";
    } catch (dmError) {
      this.logError("Earth Intel owner DM failed", dmError, { ownerId });
      const fallback = await this.client.channels.fetch(
        this.config.earthIntelOpsChannelId,
      );
      if (fallback?.isTextBased() && "send" in fallback) {
        await fallback.send(payload);
        return "ops-channel";
      }
      throw dmError;
    }
  }

  async notifyOperational({
    incidentKey,
    severity,
    title,
    description,
    details = [],
  }) {
    const now = this.now();
    const existing = this.store.getIncident(incidentKey);
    if (
      existing?.state === "open" &&
      existing.lastNotifiedAt &&
      now - existing.lastNotifiedAt < INCIDENT_REMINDER_MS
    ) {
      this.store.openIncident({
        incidentKey,
        severity,
        details: { title, description, details },
        openedAt: existing.openedAt,
      });
      return;
    }
    await this.notifyOwner(
      buildIntelHealthNotification({
        severity,
        title,
        description,
        details,
      }),
    );
    this.store.openIncident({
      incidentKey,
      severity,
      details: { title, description, details },
      openedAt: existing?.openedAt ?? now,
      lastNotifiedAt: now,
    });
  }

  async notifySourceFailure(source, state, error) {
    await this.notifyOperational({
      incidentKey: `source:${source.key}`,
      severity:
        source.kind === "social" ? "warning" : "critical",
      title: `${source.label} monitoring is unavailable`,
      description:
        "Agent K detected repeated semantic or network failures and opened a backoff circuit. Other sources continue running, and this source will be probed automatically.",
      details: [
        `Failures: ${state.consecutiveFailures}`,
        `Next probe: ${state.nextAttemptAt ? new Date(state.nextAttemptAt).toLocaleString() : "automatic"}`,
        sanitizedError(error),
      ],
    });
  }

  async handleSourceRecovery(source, previousState) {
    const incidentKey = `source:${source.key}`;
    const incident = this.store.getIncident(incidentKey);
    if (!incident || incident.state !== "open") {
      this.recoveryStreak.delete(incidentKey);
      return;
    }
    const streak = (this.recoveryStreak.get(incidentKey) ?? 0) + 1;
    this.recoveryStreak.set(incidentKey, streak);
    if (streak < 2) {
      return;
    }
    this.store.resolveIncident(incidentKey, {
      message: "Two consecutive successful polls completed.",
    }, this.now());
    this.recoveryStreak.delete(incidentKey);
    await this.notifyOwner(
      buildIntelHealthNotification({
        severity: "info",
        recovered: true,
        title: `${source.label} monitoring recovered`,
        description:
          "Agent K completed two consecutive successful polls and closed the source incident.",
      }),
    );
  }

  async evaluateNitterPoolIncident(results) {
    const attemptedSocial = results.filter(
      (result) =>
        result.attempted && result.source.kind === "social",
    );
    if (attemptedSocial.length < 3) {
      return;
    }
    const incidentKey = "transport:nitter-pool";
    if (attemptedSocial.every((result) => !result.success)) {
      const health = this.nitterTransport.healthSnapshot();
      await this.notifyOperational({
        incidentKey,
        severity: "critical",
        title: "All credential-free X monitoring is unavailable",
        description:
          "Every X/Nitter source failed in the same cycle. Official USGS, NWS, NHC, and NOAA feeds continue independently while Agent K retries the Nitter pool.",
        details: health.instances.map(
          (instance) =>
            `${instance.host}: ${instance.state}${instance.lastError ? ` — ${instance.lastError}` : ""}`,
        ),
      });
      return;
    }
    if (this.store.getIncident(incidentKey)?.state === "open") {
      const streak =
        (this.recoveryStreak.get(incidentKey) ?? 0) + 1;
      this.recoveryStreak.set(incidentKey, streak);
      if (streak >= 2) {
        this.store.resolveIncident(
          incidentKey,
          { message: "Nitter pool recovered." },
          this.now(),
        );
        this.recoveryStreak.delete(incidentKey);
        await this.notifyOwner(
          buildIntelHealthNotification({
            severity: "info",
            recovered: true,
            title: "Credential-free X monitoring recovered",
            description:
              "Two consecutive monitor cycles reached at least one healthy Nitter source.",
          }),
        );
      }
    }
  }

  healthSnapshot() {
    return {
      enabled: this.config.earthIntelEnabled,
      channelId: this.config.earthIntelChannelId,
      polling: this.pollInFlight,
      store: this.store.getHealthSnapshot(),
      nitter: this.nitterTransport.healthSnapshot(),
      sourceCount: this.sources.length,
    };
  }
}
