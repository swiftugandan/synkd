import type { Server } from "@sinkd/server";
import type { RoomStorage } from "@sinkd/server";
import type { SinkdLogger } from "./logger.js";

export type AlarmRoom = {
  key: string;
  server: Server;
  storage: RoomStorage;
};

/**
 * Polls room storage alarms and invokes Server.onAlarm when due.
 * Durable Object alarms on celld are native; this is the Node stand-in.
 */
export class AlarmScheduler {
  #timer: NodeJS.Timeout | null = null;
  #rooms: () => Iterable<AlarmRoom>;
  #log: SinkdLogger;
  #firing = new Set<string>();

  constructor(rooms: () => Iterable<AlarmRoom>, log: SinkdLogger) {
    this.#rooms = rooms;
    this.#log = log;
  }

  start(intervalMs = 1000): void {
    if (this.#timer) return;
    this.#timer = setInterval(() => {
      void this.tick();
    }, intervalMs);
    this.#timer.unref?.();
  }

  stop(): void {
    if (this.#timer) {
      clearInterval(this.#timer);
      this.#timer = null;
    }
  }

  async tick(now = Date.now()): Promise<void> {
    for (const room of this.#rooms()) {
      const getAlarm = room.storage.getAlarm?.bind(room.storage);
      const deleteAlarm = room.storage.deleteAlarm?.bind(room.storage);
      if (!getAlarm || !deleteAlarm) continue;
      const due = await getAlarm();
      if (due === null || due > now) continue;
      if (this.#firing.has(room.key)) continue;
      this.#firing.add(room.key);
      try {
        await deleteAlarm();
        await room.server.onAlarm();
        this.#log.info("alarm.fired", { room: room.key, due });
      } catch (error) {
        this.#log.error("alarm.failed", {
          room: room.key,
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        this.#firing.delete(room.key);
      }
    }
  }
}