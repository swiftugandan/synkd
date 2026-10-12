import type { Server } from "@synkd/server";
import type { SynkdLogger } from "./logger.js";
import { SqliteStorage } from "./sqlite-storage.js";

export type HibernateRoom = {
  key: string;
  server: Server;
  storage: unknown;
  lastActive: number;
  /** When false, empty rooms stay resident. */
  hibernate: boolean;
};

/**
 * Unloads empty hibernatable rooms after an idle TTL.
 * SQLite files remain on disk; next activation reopens them (NFR-DUR-1).
 */
export class RoomHibernator {
  #timer: NodeJS.Timeout | null = null;
  #rooms: () => Map<string, HibernateRoom>;
  #log: SynkdLogger;
  #idleMs: number;
  #onHibernate: (key: string) => void;

  constructor(
    rooms: () => Map<string, HibernateRoom>,
    log: SynkdLogger,
    options: {
      idleMs?: number;
      onHibernate?: (key: string) => void;
    } = {},
  ) {
    this.#rooms = rooms;
    this.#log = log;
    this.#idleMs = options.idleMs ?? 30_000;
    this.#onHibernate = options.onHibernate ?? (() => {});
  }

  start(intervalMs = 5_000): void {
    if (this.#timer) return;
    this.#timer = setInterval(() => {
      this.tick();
    }, intervalMs);
    this.#timer.unref?.();
  }

  stop(): void {
    if (this.#timer) {
      clearInterval(this.#timer);
      this.#timer = null;
    }
  }

  tick(now = Date.now()): number {
    let n = 0;
    for (const [key, room] of this.#rooms()) {
      if (!room.hibernate) continue;
      if (room.server.connections.size > 0) continue;
      if (now - room.lastActive < this.#idleMs) continue;
      if (room.storage instanceof SqliteStorage) {
        room.storage.close();
      } else if (
        room.storage &&
        typeof room.storage === "object" &&
        "close" in room.storage &&
        typeof (room.storage as { close?: unknown }).close === "function"
      ) {
        (room.storage as { close: () => void }).close();
      }
      this.#rooms().delete(key);
      this.#onHibernate(key);
      this.#log.info("room.hibernated", { room: key, idleMs: this.#idleMs });
      n += 1;
    }
    return n;
  }
}

/** Read PartyServer-style static hibernate flag (default true when unset). */
export function partyAllowsHibernate(Party: unknown): boolean {
  const options = (Party as { options?: { hibernate?: boolean } }).options;
  return options?.hibernate !== false;
}