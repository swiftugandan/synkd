import type { RoomStorage } from "@sinkd/server";

/** Minimal Durable Object storage surface used by the adapter. */
export interface DoStorage {
  get<T = unknown>(key: string): Promise<T | undefined>;
  get<T = unknown>(keys: string[]): Promise<Map<string, T>>;
  put<T = unknown>(key: string, value: T): Promise<void>;
  put<T = unknown>(entries: Record<string, T>): Promise<void>;
  delete(key: string): Promise<boolean>;
  delete(keys: string[]): Promise<number>;
  list<T = unknown>(options?: {
    prefix?: string;
    limit?: number;
  }): Promise<Map<string, T>>;
  setAlarm?(scheduledTime: number | Date): Promise<void>;
  getAlarm?(): Promise<number | null>;
  deleteAlarm?(): Promise<void>;
}

/** Adapts Cloudflare / celld Durable Object storage to sinkd RoomStorage. */
export class DoStorageAdapter implements RoomStorage {
  constructor(private readonly storage: DoStorage) {}

  get<T = unknown>(key: string): Promise<T | undefined>;
  get<T = unknown>(keys: string[]): Promise<Map<string, T>>;
  get<T = unknown>(
    keyOrKeys: string | string[],
  ): Promise<T | undefined | Map<string, T>> {
    if (Array.isArray(keyOrKeys)) return this.storage.get<T>(keyOrKeys);
    return this.storage.get<T>(keyOrKeys);
  }

  put<T = unknown>(key: string, value: T): Promise<void>;
  put<T = unknown>(entries: Record<string, T>): Promise<void>;
  put<T = unknown>(
    keyOrEntries: string | Record<string, T>,
    value?: T,
  ): Promise<void> {
    if (typeof keyOrEntries === "string") {
      return this.storage.put(keyOrEntries, value as T);
    }
    return this.storage.put(keyOrEntries);
  }

  delete(key: string): Promise<boolean>;
  delete(keys: string[]): Promise<number>;
  delete(keyOrKeys: string | string[]): Promise<boolean | number> {
    if (Array.isArray(keyOrKeys)) return this.storage.delete(keyOrKeys);
    return this.storage.delete(keyOrKeys);
  }

  list<T = unknown>(options?: {
    prefix?: string;
    limit?: number;
  }): Promise<Map<string, T>> {
    return this.storage.list<T>(options);
  }

  setAlarm(scheduledTime: number | Date): Promise<void> {
    return this.storage.setAlarm?.(scheduledTime) ?? Promise.resolve();
  }

  getAlarm(): Promise<number | null> {
    return this.storage.getAlarm?.() ?? Promise.resolve(null);
  }

  deleteAlarm(): Promise<void> {
    return this.storage.deleteAlarm?.() ?? Promise.resolve();
  }
}