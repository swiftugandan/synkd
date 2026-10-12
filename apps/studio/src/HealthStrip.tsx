import { useEffect, useState } from "react";

interface HealthPayload {
  ok: boolean;
  rooms?: number;
  connections?: number;
  metrics?: {
    connects?: number;
    messages?: number;
    lobbyRejects?: number;
  };
}

type Backend = "node" | "durable";

interface HealthStripProps {
  backend: Backend;
}

function healthUrl(backend: Backend): string {
  // Durable host has no root healthz — probe a party route (CORS + 200 JSON).
  if (backend === "durable") {
    return "http://127.0.0.1:9876/parties/main/studio-health?token=dev-token";
  }
  // Same-origin proxy in Vite / Playwright Studio for Node
  if (
    typeof window !== "undefined" &&
    (window.location.port.startsWith("517") ||
      window.location.port.startsWith("417"))
  ) {
    return "/healthz";
  }
  return "http://127.0.0.1:8787/healthz";
}

export function HealthStrip({ backend }: HealthStripProps) {
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch(healthUrl(backend), {
          signal: AbortSignal.timeout(2500),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const contentType = res.headers.get("content-type") ?? "";
        if (contentType.includes("application/json")) {
          const body = (await res.json()) as HealthPayload;
          if (!cancelled) {
            setHealth({ ok: body.ok !== false, ...body });
            setError(null);
          }
        } else if (!cancelled) {
          setHealth({ ok: true });
          setError(null);
        }
      } catch {
        if (!cancelled) {
          setHealth(null);
          setError(
            backend === "durable" ? "durable host offline" : "runtime offline",
          );
        }
      }
    };
    void tick();
    const id = window.setInterval(() => void tick(), 4000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [backend]);

  const state = error ? "down" : health?.ok ? "up" : "checking";

  return (
    <div
      className="health-strip"
      data-state={state}
      aria-live="polite"
      aria-label="Runtime health"
    >
      <span className="health-dot" aria-hidden="true" />
      <span className="health-label">
        {error ??
          (backend === "durable"
            ? "durable host reachable"
            : `rooms ${health?.rooms ?? 0} · sockets ${health?.connections ?? 0} · msgs ${health?.metrics?.messages ?? 0}`)}
      </span>
    </div>
  );
}
