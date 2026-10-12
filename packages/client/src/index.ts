import PartySocket from "partysocket";
import {
  CONNECTION_ID_QUERY,
  DEFAULT_PARTY_NAME,
  DEFAULT_PARTY_PREFIX,
} from "@sinkd/contracts";

export { PartySocket };
export {
  CONNECTION_ID_QUERY,
  DEFAULT_PARTY_NAME,
  DEFAULT_PARTY_PREFIX,
};

export interface SinkdSocketOptions {
  host: string;
  room: string;
  party?: string;
  id?: string;
  prefix?: string;
  query?: Record<string, string> | (() => Promise<Record<string, string>>);
  // PartySocket passes through additional fields
  [key: string]: unknown;
}

/** Create a PartySocket pointed at a sinkd host (PartyKit-compatible). */
export function createSinkdSocket(options: SinkdSocketOptions): PartySocket {
  const { host, room, party = DEFAULT_PARTY_NAME, ...rest } = options;
  return new PartySocket({
    host,
    room,
    party,
    ...rest,
  });
}

export function partyUrl(opts: {
  protocol?: "http" | "https" | "ws" | "wss";
  host: string;
  party?: string;
  room: string;
  prefix?: string;
  id?: string;
  token?: string;
}): string {
  const protocol = opts.protocol ?? "ws";
  const prefix = opts.prefix ?? DEFAULT_PARTY_PREFIX;
  const party = opts.party ?? DEFAULT_PARTY_NAME;
  const url = new URL(
    `${protocol}://${opts.host.replace(/\/$/, "")}/${prefix}/${party}/${opts.room}`,
  );
  if (opts.id) url.searchParams.set(CONNECTION_ID_QUERY, opts.id);
  if (opts.token) url.searchParams.set("token", opts.token);
  return url.toString();
}