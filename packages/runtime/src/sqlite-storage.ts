import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { RoomStorage } from "@sinkd/server";

/**
 * File-backed room storage using Node's built-in SQLite.
 * Values are JSON-serialized (PartyKit structured-clone subset for JSON-safe data).
 */
export class SqliteStorage implements RoomStorage {
  #db: DatabaseSync;
  #alarm: number | null = null;

  constructor(filePath: string) {
    mkdirSync(dirname(filePath), { recursive: true });
    this.#db = new DatabaseSync(filePath);
    this.#db.exec(`
      CREATE TABLE IF NOT EXISTS kv (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
    `);
    const row = this.#db
      .prepare(`SELECT value FROM meta WHERE key = 'alarm'`)
      .get() as { value: string } | undefined;
    this.#alarm = row ? Number(row.value) : null;
  }

  async get<T = unknown>(key: string): Promise<T | undefined>;
  async get<T = unknown>(keys: string[]): Promise<Map<string, T>>;
  async get<T = unknown>(
    keyOrKeys: string | string[],
  ): Promise<T | undefined | Map<string, T>> {
    if (Array.isArray(keyOrKeys)) {
      const out = new Map<string, T>();
      const stmt = this.#db.prepare(`SELECT value FROM kv WHERE key = ?`);
      for (const key of keyOrKeys) {
        const row = stmt.get(key) as { value: string } | undefined;
        if (row) out.set(key, JSON.parse(row.value) as T);
      }
      return out;
    }
    const row = this.#db
      .prepare(`SELECT value FROM kv WHERE key = ?`)
      .get(keyOrKeys) as { value: string } | undefined;
    return row ? (JSON.parse(row.value) as T) : undefined;
  }

  async put<T = unknown>(key: string, value: T): Promise<void>;
  async put<T = unknown>(entries: Record<string, T>): Promise<void>;
  async put<T = unknown>(
    keyOrEntries: string | Record<string, T>,
    value?: T,
  ): Promise<void> {
    const stmt = this.#db.prepare(
      `INSERT INTO kv(key, value) VALUES(?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    );
    if (typeof keyOrEntries === "string") {
      stmt.run(keyOrEntries, JSON.stringify(value));
      return;
    }
    this.#db.exec("BEGIN");
    try {
      for (const [key, entry] of Object.entries(keyOrEntries)) {
        stmt.run(key, JSON.stringify(entry));
      }
      this.#db.exec("COMMIT");
    } catch (error) {
      this.#db.exec("ROLLBACK");
      throw error;
    }
  }

  async delete(key: string): Promise<boolean>;
  async delete(keys: string[]): Promise<number>;
  async delete(keyOrKeys: string | string[]): Promise<boolean | number> {
    if (Array.isArray(keyOrKeys)) {
      let n = 0;
      const stmt = this.#db.prepare(`DELETE FROM kv WHERE key = ?`);
      for (const key of keyOrKeys) {
        const result = stmt.run(key);
        n += Number(result.changes ?? 0);
      }
      return n;
    }
    const result = this.#db
      .prepare(`DELETE FROM kv WHERE key = ?`)
      .run(keyOrKeys);
    return Number(result.changes ?? 0) > 0;
  }

  async list<T = unknown>(options?: {
    prefix?: string;
    limit?: number;
  }): Promise<Map<string, T>> {
    const rows = this.#db
      .prepare(`SELECT key, value FROM kv ORDER BY key ASC`)
      .all() as Array<{ key: string; value: string }>;
    const out = new Map<string, T>();
    for (const row of rows) {
      if (options?.prefix && !row.key.startsWith(options.prefix)) continue;
      out.set(row.key, JSON.parse(row.value) as T);
      if (options?.limit && out.size >= options.limit) break;
    }
    return out;
  }

  async setAlarm(scheduledTime: number | Date): Promise<void> {
    this.#alarm =
      typeof scheduledTime === "number"
        ? scheduledTime
        : scheduledTime.getTime();
    this.#db
      .prepare(
        `INSERT INTO meta(key, value) VALUES('alarm', ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      )
      .run(String(this.#alarm));
  }

  async getAlarm(): Promise<number | null> {
    return this.#alarm;
  }

  async deleteAlarm(): Promise<void> {
    this.#alarm = null;
    this.#db.prepare(`DELETE FROM meta WHERE key = 'alarm'`).run();
  }

  close(): void {
    this.#db.close();
  }
}