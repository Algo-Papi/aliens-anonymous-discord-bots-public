import { randomUUID } from "node:crypto";

export const REPORT_COOLDOWNS = Object.freeze({
  scan: Object.freeze({
    invokerMs: 45_000,
    pairMs: 10 * 60_000,
    targetMs: 90_000,
  }),
  memory: Object.freeze({
    invokerMs: 120_000,
    pairMs: 30 * 60_000,
    targetMs: 5 * 60_000,
  }),
  threat: Object.freeze({
    invokerMs: 45_000,
    pairMs: 10 * 60_000,
    targetMs: 90_000,
  }),
});

const CHANNEL_COOLDOWN_MS = 8_000;
const TARGET_HOURLY_CAP = 8;
const TARGET_HOURLY_WINDOW_MS = 60 * 60_000;

function remaining(lastUsedAt, durationMs, nowMs) {
  return Math.max(0, lastUsedAt + durationMs - nowMs);
}

function failure(scope, remainingMs) {
  return {
    ok: false,
    scope,
    remainingMs: Math.max(1, Math.ceil(remainingMs)),
  };
}

export class ReportCooldowns {
  constructor({ now = Date.now, idFactory = randomUUID } = {}) {
    this.now = now;
    this.idFactory = idFactory;
    this.invoker = new Map();
    this.pairs = new Map();
    this.targets = new Map();
    this.channels = new Map();
    this.targetEvents = new Map();
    this.reservations = new Map();
  }

  #latestReservation(predicate) {
    let latest = null;
    for (const reservation of this.reservations.values()) {
      if (predicate(reservation)) {
        latest =
          latest == null
            ? reservation.createdAt
            : Math.max(latest, reservation.createdAt);
      }
    }
    return latest;
  }

  #latest(committedMap, key, reservationPredicate) {
    const committed = committedMap.get(key) ?? null;
    const reserved = this.#latestReservation(reservationPredicate);
    if (committed == null) {
      return reserved;
    }
    if (reserved == null) {
      return committed;
    }
    return Math.max(committed, reserved);
  }

  reserve({
    guildId,
    channelId,
    command,
    invokerId,
    targetId,
    nowMs = this.now(),
  }) {
    const limits = REPORT_COOLDOWNS[command];
    if (!limits) {
      throw new TypeError(`Unknown report command: ${command}`);
    }

    const invokerKey = `${guildId}:${command}:${invokerId}`;
    const pairEntryKey = `${guildId}:${command}:${invokerId}:${targetId}`;
    const targetKey = `${guildId}:${command}:${targetId}`;
    const channelKey = `${guildId}:${channelId}`;
    const selfTarget = invokerId === targetId;

    const invokerLast = this.#latest(
      this.invoker,
      invokerKey,
      (entry) =>
        entry.guildId === guildId &&
        entry.command === command &&
        entry.invokerId === invokerId,
    );
    if (invokerLast != null) {
      const left = remaining(invokerLast, limits.invokerMs, nowMs);
      if (left > 0) {
        return failure("invoker", left);
      }
    }

    const channelLast = this.#latest(
      this.channels,
      channelKey,
      (entry) =>
        entry.guildId === guildId && entry.channelId === channelId,
    );
    if (channelLast != null) {
      const left = remaining(
        channelLast,
        CHANNEL_COOLDOWN_MS,
        nowMs,
      );
      if (left > 0) {
        return failure("channel", left);
      }
    }

    if (!selfTarget) {
      const pairLast = this.#latest(
        this.pairs,
        pairEntryKey,
        (entry) =>
          entry.guildId === guildId &&
          entry.command === command &&
          entry.invokerId === invokerId &&
          entry.targetId === targetId,
      );
      if (pairLast != null) {
        const left = remaining(pairLast, limits.pairMs, nowMs);
        if (left > 0) {
          return failure("pair", left);
        }
      }

      const targetLast = this.#latest(
        this.targets,
        targetKey,
        (entry) =>
          entry.guildId === guildId &&
          entry.command === command &&
          entry.targetId === targetId &&
          entry.invokerId !== entry.targetId,
      );
      if (targetLast != null) {
        const left = remaining(targetLast, limits.targetMs, nowMs);
        if (left > 0) {
          return failure("target", left);
        }
      }

      const hourlyKey = `${guildId}:${targetId}`;
      const cutoff = nowMs - TARGET_HOURLY_WINDOW_MS;
      const committedEvents = (this.targetEvents.get(hourlyKey) ?? []).filter(
        (eventAt) => eventAt > cutoff,
      );
      this.targetEvents.set(hourlyKey, committedEvents);
      const reservedCount = [...this.reservations.values()].filter(
        (entry) =>
          !entry.selfTarget &&
          entry.guildId === guildId &&
          entry.targetId === targetId &&
          entry.createdAt > cutoff,
      ).length;
      if (committedEvents.length + reservedCount >= TARGET_HOURLY_CAP) {
        const oldest = committedEvents[0] ?? nowMs;
        return failure(
          "hourly_target_cap",
          oldest + TARGET_HOURLY_WINDOW_MS - nowMs,
        );
      }
    }

    const token = this.idFactory();
    this.reservations.set(token, {
      token,
      guildId,
      channelId,
      command,
      invokerId,
      targetId,
      createdAt: nowMs,
      selfTarget,
    });
    return { ok: true, token };
  }

  commit(token) {
    const reservation = this.reservations.get(token);
    if (!reservation) {
      return false;
    }
    this.reservations.delete(token);
    const {
      guildId,
      channelId,
      command,
      invokerId,
      targetId,
      createdAt,
      selfTarget,
    } = reservation;
    this.invoker.set(
      `${guildId}:${command}:${invokerId}`,
      createdAt,
    );
    this.channels.set(`${guildId}:${channelId}`, createdAt);

    if (!selfTarget) {
      this.pairs.set(
        `${guildId}:${command}:${invokerId}:${targetId}`,
        createdAt,
      );
      this.targets.set(
        `${guildId}:${command}:${targetId}`,
        createdAt,
      );
      const hourlyKey = `${guildId}:${targetId}`;
      const events = this.targetEvents.get(hourlyKey) ?? [];
      events.push(createdAt);
      this.targetEvents.set(hourlyKey, events);
    }
    return true;
  }

  release(token) {
    return this.reservations.delete(token);
  }
}

export function formatRemaining(milliseconds) {
  const seconds = Math.ceil(milliseconds / 1_000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.ceil(seconds / 60);
  return `${minutes}m`;
}
