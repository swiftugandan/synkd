export { Server, type PartyClass } from "./server.js";
export { Connection } from "./connection.js";
export { MemoryStorage, type RoomStorage } from "./storage.js";
export type {
  WSMessage,
  ConnectionState,
  ConnectionSetStateFn,
  ConnectionContext,
  Lobby,
  PartyServerOptions,
} from "./types.js";

/** kebab-case URL party → PascalCase binding name (PartyServer convention). */
export function partyNameToBinding(party: string): string {
  return party
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}