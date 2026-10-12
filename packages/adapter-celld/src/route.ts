import {
  DEFAULT_PARTY_PREFIX,
  parsePartyRoute,
} from "@sinkd/contracts";
import { partyNameToBinding, type PartyServerOptions } from "@sinkd/server";

export interface CelldEnv {
  [binding: string]: {
    idFromName(name: string): { toString(): string };
    get(id: { toString(): string }): { fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> };
  };
}

/**
 * PartyKit-shaped router for celld Workers: `/parties/:party/:room` → DO stub.
 */
export async function routeSinkdRequest(
  request: Request,
  env: CelldEnv,
  options: PartyServerOptions & {
    prefix?: string;
    bindings?: Record<string, string>;
  } = {},
): Promise<Response | null> {
  const prefix = options.prefix ?? DEFAULT_PARTY_PREFIX;
  const url = new URL(request.url);
  const route = parsePartyRoute(url.pathname, prefix);
  if (!route) return null;

  const className =
    options.bindings?.[route.party] ?? partyNameToBinding(route.party);
  const namespace = env[className];
  if (!namespace) {
    return new Response(`Unknown party binding: ${className}`, { status: 404 });
  }

  const lobby = {
    party: route.party,
    className,
    name: route.room,
  };

  const isUpgrade = request.headers.get("Upgrade")?.toLowerCase() === "websocket";
  const hook = isUpgrade ? options.onBeforeConnect : options.onBeforeRequest;
  let forwarded = request;
  if (hook) {
    const result = await hook(request, lobby);
    if (result instanceof Response) return result;
    if (result instanceof Request) forwarded = result;
  }

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, HEAD, OPTIONS, PUT, PATCH, DELETE",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  const id = namespace.idFromName(route.room);
  const stub = namespace.get(id);
  const response = await stub.fetch(forwarded);
  if (isUpgrade) return response;

  const headers = new Headers(response.headers);
  if (!headers.has("Access-Control-Allow-Origin")) {
    headers.set("Access-Control-Allow-Origin", "*");
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}