function denial(code, message, remainingMs = 0) {
  return { ok: false, code, message, remainingMs };
}

export class ResearchLimits {
  constructor({
    now = Date.now,
    cooldownMs = 60_000,
    maxConcurrentJobs = 2,
  } = {}) {
    this.now = now;
    this.cooldownMs = cooldownMs;
    this.maxConcurrentJobs = maxConcurrentJobs;
    this.activeUsers = new Set();
    this.completedAt = new Map();
  }

  reserve(userId) {
    if (this.activeUsers.has(userId)) {
      return denial(
        "USER_ACTIVE",
        "You already have a Bureau research job running.",
      );
    }
    if (this.activeUsers.size >= this.maxConcurrentJobs) {
      return denial(
        "SERVER_BUSY",
        "Both Bureau research terminals are occupied. Try again shortly.",
      );
    }
    const elapsed = this.now() - (this.completedAt.get(userId) ?? 0);
    if (elapsed < this.cooldownMs) {
      return denial(
        "COOLDOWN",
        "Your Desk Analyst terminal is cooling down.",
        this.cooldownMs - elapsed,
      );
    }
    this.activeUsers.add(userId);
    return { ok: true, token: userId };
  }

  complete(token) {
    if (!this.activeUsers.delete(token)) {
      return false;
    }
    this.completedAt.set(token, this.now());
    return true;
  }

  release(token) {
    return this.activeUsers.delete(token);
  }

  diagnostics() {
    return {
      activeJobs: this.activeUsers.size,
      maxConcurrentJobs: this.maxConcurrentJobs,
    };
  }
}
