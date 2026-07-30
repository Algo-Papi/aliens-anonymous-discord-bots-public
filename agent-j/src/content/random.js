import { randomInt as cryptoRandomInt } from "node:crypto";

export class RandomSource {
  int(min, max) {
    return cryptoRandomInt(min, max);
  }

  chance(probability) {
    return this.int(0, 1_000_000) < probability * 1_000_000;
  }
}

export class SeededRandom {
  constructor(seed = 1) {
    this.state = seed >>> 0 || 1;
  }

  #next() {
    let value = this.state;
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    this.state = value >>> 0;
    return this.state;
  }

  int(min, max) {
    if (!Number.isInteger(min) || !Number.isInteger(max) || max <= min) {
      throw new RangeError("SeededRandom.int requires integer min < max.");
    }
    return min + (this.#next() % (max - min));
  }

  chance(probability) {
    return this.int(0, 1_000_000) < probability * 1_000_000;
  }
}
