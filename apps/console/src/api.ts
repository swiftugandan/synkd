const TOKEN_KEY = "synkd.adminToken";

export function getAdminToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setAdminToken(token: string | null): void {
  if (!token) sessionStorage.removeItem(TOKEN_KEY);
  else sessionStorage.setItem(TOKEN_KEY, token);
}

export function studioBaseUrl(): string {
  if (typeof window === "undefined") return "http://127.0.0.1:5173";
  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:5173`;
}

async function api<T>(
  path: string,
  init?: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string }> {
  const token = getAdminToken();
  const headers = new Headers(init?.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  try {
    const res = await fetch(path, { ...init, headers });
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: (await res.text()) || `HTTP ${res.status}`,
      };
    }
    const ct = res.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      return { ok: true, data: (await res.json()) as T };
    }
    return { ok: true, data: (await res.text()) as T };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export type HealthPayload = {
  ok: boolean;
  version?: string;
  uptimeMs?: number;
  rooms?: number;
  connections?: number;
  metrics?: Record<string, number>;
  fleet?: { tenantId: string };
};

export type RoomRow = {
  party: string;
  room: string;
  connections: number;
  lastActive: number;
  hibernate: boolean;
  tags?: string[];
};

export type CapsPayload = {
  ok: boolean;
  capabilities: {
    runtime: string;
    alarms: boolean;
    hibernation: boolean;
    metrics: boolean;
    yjs: boolean;
    celld?: Record<string, boolean>;
  };
};

export const control = {
  health: () => api<HealthPayload>("/v1/health"),
  rooms: () => api<{ ok: boolean; rooms: RoomRow[] }>("/v1/rooms"),
  caps: () => api<CapsPayload>("/v1/capabilities"),
  metrics: () => api<string>("/v1/metrics"),
  hibernate: (party: string, room: string) =>
    api<{ ok: boolean }>(
      `/v1/rooms/${encodeURIComponent(party)}/${encodeURIComponent(room)}/hibernate`,
      { method: "POST" },
    ),
};