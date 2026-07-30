import { randomUUID } from "node:crypto";

import {
  DEFAULT_COSMETICS,
  getItem,
  isArtifact,
  itemsByKind,
} from "./catalog.js";

function iso(nowMs) {
  return new Date(nowMs).toISOString();
}

function economyError(code, message, details = {}) {
  return Object.assign(new Error(message), { code, ...details });
}

const COSMETIC_COLUMN = Object.freeze({
  theme: "selected_case_theme_id",
  stamp: "selected_victory_stamp_id",
  broadcast: "selected_broadcast_pack_id",
});

export class EconomyStore {
  constructor(
    database,
    { now = Date.now, idFactory = randomUUID } = {},
  ) {
    this.database = database;
    this.now = now;
    this.idFactory = idFactory;
  }

  ensureUser(guildId, userId, nowMs = this.now()) {
    return this.database.transaction(() => {
      const timestamp = iso(nowMs);
      const inserted = this.database
        .prepare(`
          INSERT INTO agent_j_users (
            guild_id,
            user_id,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?)
          ON CONFLICT (guild_id, user_id) DO NOTHING
        `)
        .run(guildId, userId, timestamp, timestamp);
      const user = this.database
        .prepare(`
          SELECT *
          FROM agent_j_users
          WHERE guild_id = ? AND user_id = ?
        `)
        .get(guildId, userId);
      if (inserted.changes === 1) {
        this.database
          .prepare(`
            INSERT OR IGNORE INTO economy_ledger (
              id,
              idempotency_key,
              guild_id,
              user_id,
              amount,
              balance_after,
              reason,
              reference_id,
              created_at
            ) VALUES (?, ?, ?, ?, 20, 20, 'opening_balance', NULL, ?)
          `)
          .run(
            `opening:${guildId}:${userId}`,
            `opening:${guildId}:${userId}`,
            guildId,
            userId,
            timestamp,
          );
      }
      return user;
    })();
  }

  getUser(guildId, userId) {
    return this.ensureUser(guildId, userId);
  }

  ownsItem(guildId, userId, itemId) {
    return Boolean(
      this.database
        .prepare(`
          SELECT 1
          FROM arena_owned_items
          WHERE guild_id = ? AND user_id = ? AND item_id = ?
        `)
        .get(guildId, userId, itemId),
    );
  }

  getInventory(guildId, userId) {
    this.ensureUser(guildId, userId);
    return this.database
      .prepare(`
        SELECT gadget_id, quantity
        FROM arena_inventory
        WHERE guild_id = ? AND user_id = ? AND quantity > 0
        ORDER BY gadget_id
      `)
      .all(guildId, userId)
      .map((row) => ({
        ...row,
        item: getItem(row.gadget_id),
      }))
      .filter((row) => row.item);
  }

  getOwnedItems(guildId, userId, kind = null) {
    this.ensureUser(guildId, userId);
    return this.database
      .prepare(`
        SELECT item_id, purchased_at, purchase_price
        FROM arena_owned_items
        WHERE guild_id = ? AND user_id = ?
        ORDER BY purchased_at, item_id
      `)
      .all(guildId, userId)
      .map((row) => ({ ...row, item: getItem(row.item_id) }))
      .filter((row) => row.item && (!kind || row.item.kind === kind));
  }

  purchase({
    guildId,
    userId,
    itemId,
    idempotencyKey,
    nowMs = this.now(),
  }) {
    const catalogItem = getItem(itemId);
    if (!catalogItem) {
      throw economyError("UNKNOWN_ITEM", "That shop item does not exist.");
    }
    if (!idempotencyKey) {
      throw new TypeError("A purchase idempotency key is required.");
    }

    return this.database.transaction(() => {
      const duplicate = this.database
        .prepare(`
          SELECT balance_after
          FROM economy_ledger
          WHERE idempotency_key = ?
        `)
        .get(idempotencyKey);
      if (duplicate) {
        return {
          item: catalogItem,
          balance: duplicate.balance_after,
          idempotent: true,
        };
      }

      const user = this.ensureUser(guildId, userId, nowMs);
      if (catalogItem.kind !== "gadget") {
        if (this.ownsItem(guildId, userId, itemId)) {
          throw economyError(
            "ALREADY_OWNED",
            `You already own **${catalogItem.name}**.`,
          );
        }
      } else {
        const quantity =
          this.database
            .prepare(`
              SELECT quantity
              FROM arena_inventory
              WHERE guild_id = ? AND user_id = ? AND gadget_id = ?
            `)
            .get(guildId, userId, itemId)?.quantity ?? 0;
        if (quantity >= 20) {
          throw economyError(
            "INVENTORY_FULL",
            `Your ${catalogItem.name} inventory is already at the limit of 20.`,
          );
        }
      }
      if (user.credits < catalogItem.price) {
        throw economyError(
          "INSUFFICIENT_CREDITS",
          `You need **${catalogItem.price} BC** but currently have **${user.credits} BC**.`,
          { required: catalogItem.price, balance: user.credits },
        );
      }

      const timestamp = iso(nowMs);
      const balance = user.credits - catalogItem.price;
      this.database
        .prepare(`
          UPDATE agent_j_users
          SET credits = ?, updated_at = ?
          WHERE guild_id = ? AND user_id = ?
        `)
        .run(balance, timestamp, guildId, userId);
      this.database
        .prepare(`
          INSERT INTO economy_ledger (
            id,
            idempotency_key,
            guild_id,
            user_id,
            amount,
            balance_after,
            reason,
            reference_id,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, 'shop_purchase', ?, ?)
        `)
        .run(
          this.idFactory(),
          idempotencyKey,
          guildId,
          userId,
          -catalogItem.price,
          balance,
          itemId,
          timestamp,
        );

      if (catalogItem.kind === "gadget") {
        this.database
          .prepare(`
            INSERT INTO arena_inventory (
              guild_id,
              user_id,
              gadget_id,
              quantity
            ) VALUES (?, ?, ?, 1)
            ON CONFLICT (guild_id, user_id, gadget_id)
            DO UPDATE SET quantity = quantity + 1
          `)
          .run(guildId, userId, itemId);
      } else {
        this.database
          .prepare(`
            INSERT INTO arena_owned_items (
              guild_id,
              user_id,
              item_id,
              purchased_at,
              purchase_price
            ) VALUES (?, ?, ?, ?, ?)
          `)
          .run(
            guildId,
            userId,
            itemId,
            timestamp,
            catalogItem.price,
          );
      }

      return { item: catalogItem, balance, idempotent: false };
    })();
  }

  getCosmetics(guildId, userId) {
    const user = this.ensureUser(guildId, userId);
    return {
      theme: user.selected_case_theme_id ?? DEFAULT_COSMETICS.theme,
      stamp:
        user.selected_victory_stamp_id ?? DEFAULT_COSMETICS.stamp,
      broadcast:
        user.selected_broadcast_pack_id ?? DEFAULT_COSMETICS.broadcast,
    };
  }

  equipCosmetic(
    guildId,
    userId,
    itemId,
    nowMs = this.now(),
  ) {
    const catalogItem = getItem(itemId);
    const column = COSMETIC_COLUMN[catalogItem?.kind];
    if (!catalogItem || !column) {
      throw economyError(
        "NOT_COSMETIC",
        "That item cannot be equipped as an Arena cosmetic.",
      );
    }
    this.ensureUser(guildId, userId, nowMs);
    if (!this.ownsItem(guildId, userId, itemId)) {
      throw economyError(
        "NOT_OWNED",
        `You do not own **${catalogItem.name}**.`,
      );
    }
    this.database
      .prepare(`
        UPDATE agent_j_users
        SET ${column} = ?, updated_at = ?
        WHERE guild_id = ? AND user_id = ?
      `)
      .run(itemId, iso(nowMs), guildId, userId);
    return this.getCosmetics(guildId, userId);
  }

  artifactAvailability(guildId, userId, artifactId, nowMs = this.now()) {
    const artifact = getItem(artifactId);
    if (!artifact || !isArtifact(artifactId)) {
      throw economyError("NOT_ARTIFACT", "That is not a Black Vault Artifact.");
    }
    const owned = this.ownsItem(guildId, userId, artifactId);
    const row = this.database
      .prepare(`
        SELECT last_activated_at
        FROM arena_artifact_cooldowns
        WHERE guild_id = ? AND user_id = ? AND artifact_id = ?
      `)
      .get(guildId, userId, artifactId);
    const cooldownEndsAt = row
      ? new Date(row.last_activated_at).getTime() + 7 * 24 * 60 * 60_000
      : 0;
    return {
      artifact,
      owned,
      available: owned && cooldownEndsAt <= nowMs,
      cooldownEndsAt:
        cooldownEndsAt > nowMs ? iso(cooldownEndsAt) : null,
    };
  }

  getCatalog(kind) {
    return itemsByKind(kind);
  }
}

export { economyError };
