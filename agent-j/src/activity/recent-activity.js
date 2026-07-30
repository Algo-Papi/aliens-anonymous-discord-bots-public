import { randomInt as cryptoRandomInt } from "node:crypto";

const MAX_USERS_PER_CHANNEL = 25;
const MAX_AGE_MS = 30 * 60_000;
const WITNESS_REUSE_MS = 20 * 60_000;

const FALLBACK_WITNESSES = Object.freeze([
  "an unpaid Bureau intern",
  "a traumatized Roomba",
  "the night-shift coroner",
  "three Worm Guys on their lunch break",
  "a visibly exhausted federal veterinarian",
  "a neuralyzed divorce attorney holding the wrong briefcase",
  "an Area 51 janitor with temporary diplomatic immunity",
  "a livestock investigator who has stopped asking which livestock",
  "the haunted fax machine from Evidence Room B",
  "a government clone still wearing the original's name tag",
]);

function channelKey(guildId, channelId) {
  return `${guildId}:${channelId}`;
}

function recencyWeight(ageMs) {
  const minutes = ageMs / 60_000;
  if (minutes <= 5) return 6;
  if (minutes <= 10) return 5;
  if (minutes <= 15) return 4;
  if (minutes <= 20) return 3;
  if (minutes <= 25) return 2;
  return 1;
}

function weightedChoice(entries, randomInt) {
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  let cursor = randomInt(0, total);
  for (const entry of entries) {
    if (cursor < entry.weight) {
      return entry;
    }
    cursor -= entry.weight;
  }
  return entries.at(-1);
}

export class RecentActivity {
  constructor({ now = Date.now, randomInt = cryptoRandomInt } = {}) {
    this.now = now;
    this.randomInt = randomInt;
    this.channels = new Map();
    this.recentWitnesses = new Map();
  }

  record({ guildId, channelId, userId, nowMs = this.now() }) {
    const key = channelKey(guildId, channelId);
    const activity = this.channels.get(key) ?? new Map();
    activity.delete(userId);
    activity.set(userId, nowMs);

    const cutoff = nowMs - MAX_AGE_MS;
    for (const [candidateId, lastSeenAt] of activity) {
      if (lastSeenAt <= cutoff) {
        activity.delete(candidateId);
      }
    }
    while (activity.size > MAX_USERS_PER_CHANNEL) {
      activity.delete(activity.keys().next().value);
    }
    this.channels.set(key, activity);
  }

  async selectWitness({
    guildId,
    channelId,
    invokerId,
    targetId,
    isEligible,
    nowMs = this.now(),
  }) {
    const key = channelKey(guildId, channelId);
    const activity = this.channels.get(key) ?? new Map();
    const cutoff = nowMs - MAX_AGE_MS;
    const recentWitnesses = (
      this.recentWitnesses.get(key) ?? []
    ).filter((entry) => entry.selectedAt > nowMs - WITNESS_REUSE_MS);
    this.recentWitnesses.set(key, recentWitnesses);
    const recentlyUsed = new Set(
      recentWitnesses.map((entry) => entry.userId),
    );

    const candidates = [];
    for (const [userId, lastSeenAt] of activity) {
      if (
        lastSeenAt <= cutoff ||
        userId === invokerId ||
        userId === targetId
      ) {
        continue;
      }
      if (await isEligible(userId)) {
        candidates.push({
          userId,
          lastSeenAt,
          weight: recencyWeight(nowMs - lastSeenAt),
        });
      }
    }

    const freshCandidates = candidates.filter(
      (entry) => !recentlyUsed.has(entry.userId),
    );
    const eligiblePool =
      freshCandidates.length > 0 ? freshCandidates : candidates;
    if (eligiblePool.length === 0) {
      return {
        kind: "fallback",
        text: FALLBACK_WITNESSES[
          this.randomInt(0, FALLBACK_WITNESSES.length)
        ],
      };
    }

    const selected = weightedChoice(eligiblePool, this.randomInt);
    recentWitnesses.push({
      userId: selected.userId,
      selectedAt: nowMs,
    });
    this.recentWitnesses.set(key, recentWitnesses);
    return {
      kind: "member",
      userId: selected.userId,
      text: `<@${selected.userId}>`,
    };
  }
}

export { FALLBACK_WITNESSES, recencyWeight };
