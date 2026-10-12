/** kebab-case party segment from the URL (e.g. `main`). */
export type PartyName = string & { readonly __brand: "PartyName" };

/** Opaque room identity string. */
export type RoomId = string & { readonly __brand: "RoomId" };

/** Connection identifier (`_pk` or server-generated). */
export type ConnectionId = string & { readonly __brand: "ConnectionId" };

/** Connection tag string. */
export type Tag = string & { readonly __brand: "Tag" };

export interface PartyRoute {
  readonly prefix: string;
  readonly party: PartyName;
  readonly room: RoomId;
}

export function asPartyName(value: string): PartyName {
  return value as PartyName;
}

export function asRoomId(value: string): RoomId {
  return value as RoomId;
}

export function asConnectionId(value: string): ConnectionId {
  return value as ConnectionId;
}

export function asTag(value: string): Tag {
  return value as Tag;
}