/** Multi-tenant seam — v1 hard-codes default. */
export type FleetContext = {
  tenantId: string;
};

export const DEFAULT_TENANT_ID = "default";

export function fleetFromRequest(
  request: Request,
  fallback: string = DEFAULT_TENANT_ID,
): FleetContext {
  const header = request.headers.get("x-synkd-tenant")?.trim();
  return { tenantId: header && header.length > 0 ? header : fallback };
}