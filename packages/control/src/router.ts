import type { FleetContext } from "./fleet.js";
import { fleetFromRequest } from "./fleet.js";
import type { RuntimeInspector } from "./inspector.js";

export type AdminGate = (
  request: Request,
) => Response | Request | void | Promise<Response | Request | void>;

export type ControlRouterOptions = {
  inspector: RuntimeInspector;
  adminAuth: AdminGate;
  /** Default tenant when x-synkd-tenant absent */
  tenantId?: string;
};

/**
 * Handles `/v1/*` operator routes. Returns null if path is not under /v1.
 */
export async function handleControlRequest(
  request: Request,
  options: ControlRouterOptions,
): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/v1/") && url.pathname !== "/v1") {
    return null;
  }

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  const gated = await options.adminAuth(request);
  if (gated instanceof Response) return gated;
  const authed = gated instanceof Request ? gated : request;
  const fleet = fleetFromRequest(authed, options.tenantId ?? "default");

  // v1 ignores non-default tenants (pathway only)
  if (fleet.tenantId !== (options.tenantId ?? "default")) {
    return Response.json(
      {
        ok: false,
        error: "multi_tenant_not_enabled",
        message: "This fleet is single-tenant (default). See docs/multi-tenant-path.md",
        fleet,
      },
      { status: 501 },
    );
  }

  return route(authed, url, options.inspector, fleet);
}

async function route(
  request: Request,
  url: URL,
  inspector: RuntimeInspector,
  fleet: FleetContext,
): Promise<Response> {
  const path = url.pathname.replace(/\/+$/, "") || "/";

  if (path === "/v1/health" && request.method === "GET") {
    return Response.json({ ...inspector.health(), fleet });
  }

  if (path === "/v1/metrics" && request.method === "GET") {
    return new Response(inspector.metricsText(), {
      headers: {
        "content-type": "text/plain; version=0.0.4; charset=utf-8",
      },
    });
  }

  if (path === "/v1/capabilities" && request.method === "GET") {
    return Response.json({
      ok: true,
      fleet,
      capabilities: inspector.capabilities(),
    });
  }

  if (path === "/v1/rooms" && request.method === "GET") {
    return Response.json({
      ok: true,
      fleet,
      rooms: inspector.listRooms(),
    });
  }

  const roomMatch = path.match(/^\/v1\/rooms\/([^/]+)\/([^/]+)$/);
  if (roomMatch) {
    const party = decodeURIComponent(roomMatch[1]!);
    const room = decodeURIComponent(roomMatch[2]!);
    if (request.method === "GET") {
      const snap = await inspector.getRoom(party, room);
      if (!snap) return new Response("Not Found", { status: 404 });
      return Response.json({ ok: true, fleet, room: snap });
    }
  }

  const hibernateMatch = path.match(
    /^\/v1\/rooms\/([^/]+)\/([^/]+)\/hibernate$/,
  );
  if (hibernateMatch && request.method === "POST") {
    const party = decodeURIComponent(hibernateMatch[1]!);
    const room = decodeURIComponent(hibernateMatch[2]!);
    const ok = await inspector.hibernateRoom(party, room);
    if (!ok) return new Response("Not Found", { status: 404 });
    return Response.json({ ok: true, fleet, hibernated: { party, room } });
  }

  return new Response("Not Found", { status: 404 });
}