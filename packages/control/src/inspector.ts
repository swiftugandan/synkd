import type { HealthReport } from "@synkd/contracts";

export type RoomSnapshot = {
  party: string;
  room: string;
  connections: number;
  lastActive: number;
  hibernate: boolean;
  tags?: string[];
  nextAlarm?: number | null;
  storageKeys?: number;
};

export type NodeCapabilities = {
  runtime: "node" | "celld";
  alarms: boolean;
  hibernation: boolean;
  metrics: boolean;
  yjs: boolean;
  /** Present when celld caps were probed */
  celld?: {
    acceptWebSocket: boolean;
    getWebSockets: boolean;
    getTags: boolean;
  };
};

/**
 * Read/control surface over the live room registry.
 * Implemented by @synkd/runtime — Console never touches private Maps.
 */
export interface RuntimeInspector {
  health(): HealthReport;
  metricsText(): string;
  listRooms(): RoomSnapshot[];
  getRoom(party: string, room: string): Promise<RoomSnapshot | null>;
  hibernateRoom(party: string, room: string): Promise<boolean>;
  capabilities(): NodeCapabilities;
}