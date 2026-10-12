import { SynkdError, SynkdErrorCode } from "./errors.js";
import { DEFAULT_PARTY_PREFIX } from "./limits.js";
import { asPartyName, asRoomId, type PartyRoute } from "./types.js";

/**
 * Parse `/[prefix]/[party]/[room]` from a URL pathname.
 * Returns null when the path is not a party route (caller may treat as Worker fallback).
 */
export function parsePartyRoute(
  pathname: string,
  prefix: string = DEFAULT_PARTY_PREFIX,
): PartyRoute | null {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length < 3) return null;
  if (segments[0] !== prefix) return null;

  const party = segments[1];
  const room = segments[2];
  if (!party || !room) return null;
  if (party.includes("..") || room.includes("..")) {
    throw new SynkdError(
      SynkdErrorCode.ROUTE_NOT_FOUND,
      "Invalid party route",
      404,
    );
  }

  return {
    prefix,
    party: asPartyName(party),
    room: asRoomId(room),
  };
}

export function partyRoomKey(party: string, room: string): string {
  return `${party}/${room}`;
}