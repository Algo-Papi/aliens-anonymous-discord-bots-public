export class ContentHistory {
  constructor() {
    this.poolItems = new Map();
    this.signatures = new Map();
  }

  choose(poolKey, entries, random) {
    if (entries.length === 0) {
      throw new Error(`Content pool is empty: ${poolKey}`);
    }
    const recent = this.poolItems.get(poolKey) ?? [];
    const recentIds = new Set(recent);
    const available = entries.filter((entry) => !recentIds.has(entry.id));
    const source = available.length > 0 ? available : entries;
    const totalWeight = source.reduce(
      (sum, entry) => sum + (entry.weight ?? 1),
      0,
    );
    let cursor = random.int(0, totalWeight);
    let selected = source.at(-1);
    for (const entry of source) {
      cursor -= entry.weight ?? 1;
      if (cursor < 0) {
        selected = entry;
        break;
      }
    }
    recent.push(selected.id);
    while (recent.length > 5) {
      recent.shift();
    }
    this.poolItems.set(poolKey, recent);
    return selected;
  }

  hasRecentSignature(command, signature) {
    return (this.signatures.get(command) ?? []).includes(signature);
  }

  recordSignature(command, signature) {
    const recent = this.signatures.get(command) ?? [];
    recent.push(signature);
    while (recent.length > 10) {
      recent.shift();
    }
    this.signatures.set(command, recent);
  }
}

export function entries(prefix, texts, defaults = {}) {
  return Object.freeze(
    texts.map((text, index) =>
      Object.freeze({
        id: `${prefix}-${String(index + 1).padStart(3, "0")}`,
        text,
        weight: 1,
        tone: "standard",
        tags: [],
        families: [],
        ...defaults,
      }),
    ),
  );
}
