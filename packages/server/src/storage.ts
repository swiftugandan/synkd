export interface RoomStorage {
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

export class MemoryStorage implements RoomStorage {
  #map = new Map<string, unknown>();
  #alarm: number | null = null;

  async get<T = unknown>(key: string): Promise<T | undefined>;
  async get<T = unknown>(keys: string[]): Promise<Map<string, T>>;
  async get<T = unknown>(
    keyOrKeys: string | string[],
  ): Promise<T | undefined | Map<string, T>> {
    if (Array.isArray(keyOrKeys)) {
      const out = new Map<string, T>();
      for (const key of keyOrKeys) {
        if (this.#map.has(key)) out.set(key, this.#map.get(key) as T);
      }
      return out;
    }
    return this.#map.get(keyOrKeys) as T | undefined;
  }

  async put<T = unknown>(key: string, value: T): Promise<void>;
  async put<T = unknown>(entries: Record<string, T>): Promise<void>;
  async put<T = unknown>(
    keyOrEntries: string | Record<string, T>,
    value?: T,
  ): Promise<void> {
    if (typeof keyOrEntries === "string") {
      this.#map.set(keyOrEntries, value);
      return;
    }
    for (const [key, entry] of Object.entries(keyOrEntries)) {
      this.#map.set(key, entry);
    }
  }

  async delete(key: string): Promise<boolean>;
  async delete(keys: string[]): Promise<number>;
  async delete(keyOrKeys: string | string[]): Promise<boolean | number> {
    if (Array.isArray(keyOrKeys)) {
      let n = 0;
      for (const key of keyOrKeys) {
        if (this.#map.delete(key)) n += 1;
      }
      return n;
    }
    return this.#map.delete(keyOrKeys);
  }

  async list<T = unknown>(options?: {
    prefix?: string;
    limit?: number;
  }): Promise<Map<string, T>> {
    const out = new Map<string, T>();
    for (const [key, value] of this.#map) {
      if (options?.prefix && !key.startsWith(options.prefix)) continue;
      out.set(key, value as T);
      if (options?.limit && out.size >= options.limit) break;
    }
    return out;
  }

  async setAlarm(scheduledTime: number | Date): Promise<void> {
    this.#alarm =
      typeof scheduledTime === "number"
        ? scheduledTime
        : scheduledTime.getTime();
  }

  async getAlarm(): Promise<number | null> {
    return this.#alarm;
  }

  async deleteAlarm(): Promise<void> {
    this.#alarm = null;
  }
}