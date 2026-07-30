import { randomUUID } from "node:crypto";

export class ResearchSessions {
  constructor({ now = Date.now, ttlMs = 15 * 60_000 } = {}) {
    this.now = now;
    this.ttlMs = ttlMs;
    this.sessions = new Map();
  }

  create(values) {
    this.sweep();
    const id = randomUUID();
    const session = {
      id,
      mode: "fact_check",
      scope: "focused",
      tier: "standard",
      question: "",
      result: null,
      ...values,
      createdAt: this.now(),
      expiresAt: this.now() + this.ttlMs,
    };
    this.sessions.set(id, session);
    return session;
  }

  get(id, userId) {
    const session = this.sessions.get(id);
    if (!session || session.expiresAt <= this.now()) {
      this.sessions.delete(id);
      return null;
    }
    if (session.userId !== userId) {
      return null;
    }
    return session;
  }

  update(id, userId, changes) {
    const session = this.get(id, userId);
    if (!session) {
      return null;
    }
    Object.assign(session, changes);
    return session;
  }

  delete(id, userId) {
    const session = this.get(id, userId);
    if (!session) {
      return false;
    }
    return this.sessions.delete(id);
  }

  sweep() {
    const now = this.now();
    for (const [id, session] of this.sessions) {
      if (session.expiresAt <= now) {
        this.sessions.delete(id);
      }
    }
  }
}
