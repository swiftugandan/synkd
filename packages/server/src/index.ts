export { Server, type PartyClass } from "./server.js";
export { Connection } from "./connection.js";
export { MemoryStorage, type RoomStorage } from "./storage.js";
export {
  InProcessPartyStub,
  createMemoryPartyNamespace,
  type PartyFetcher,
} from "./party-stub.js";
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

/** Inverse of partyNameToBinding for docs/codegen (Main → main is lossy). */
export function bindingToPartyHint(binding: string): string {
  return binding
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();
}