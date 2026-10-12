import { useCallback, useEffect, useMemo, useState } from "react";
import { BrandMark, StatusDot } from "@synkd/ui";
import {
  control,
  getAdminToken,
  setAdminToken,
  studioBaseUrl,
  type CapsPayload,
  type HealthPayload,
  type RoomRow,
} from "./api";

type Gate = "loading" | "login" | "ready" | "error";

function formatUptime(ms: number | undefined): string {
  if (!ms || ms < 0) return "—";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function idleLabel(lastActive: number): string {
  const ago = Math.max(0, Date.now() - lastActive);
  if (ago < 5_000) return "live";
  if (ago < 60_000) return `${Math.floor(ago / 1000)}s idle`;
  return `${Math.floor(ago / 60_000)}m idle`;
}

export function App() {
  const [gate, setGate] = useState<Gate>("loading");
  const [tokenDraft, setTokenDraft] = useState(() => getAdminToken() ?? "");
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [caps, setCaps] = useState<CapsPayload["capabilities"] | null>(null);
  const [metricsPreview, setMetricsPreview] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const fleetState = useMemo(() => {
    if (gate === "loading") return "checking" as const;
    if (gate === "error" || gate === "login") return "down" as const;
    return health?.ok ? ("up" as const) : ("down" as const);
  }, [gate, health]);

  const refresh = useCallback(async () => {
    const h = await control.health();
    if (!h.ok) {
      if (h.status === 401 || h.status === 403) {
        setGate("login");
        setError("Admin token required");
        return;
      }
      setGate("error");
      setError(h.error);
      return;
    }
    setHealth(h.data);
    const [r, c, m] = await Promise.all([
      control.rooms(),
      control.caps(),
      control.metrics(),
    ]);
    if (r.ok) setRooms(r.data.rooms);
    if (c.ok) setCaps(c.data.capabilities);
    if (m.ok) setMetricsPreview(String(m.data).split("\n").slice(0, 12).join("\n"));
    setError(null);
    setGate("ready");
  }, []);

  useEffect(() => {
    if (!getAdminToken()) {
      setGate("login");
      return;
    }
    void refresh();
    const id = window.setInterval(() => void refresh(), 5000);
    return () => window.clearInterval(id);
  }, [refresh]);

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setAdminToken(tokenDraft.trim() || null);
    setGate("loading");
    await refresh();
  }

  function logout() {
    setAdminToken(null);
    setTokenDraft("");
    setGate("login");
    setHealth(null);
    setRooms([]);
  }

  async function hibernate(party: string, room: string) {
    setBusy(`${party}/${room}`);
    const res = await control.hibernate(party, room);
    setBusy(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    await refresh();
  }

  const studioUrl = studioBaseUrl();

  return (
    <div className="shell">
      <header className="topbar">
        <BrandMark size="md" meta="console" />
        <nav className="top-links" aria-label="Product">
          <a href="http://127.0.0.1:5180/operators/">Docs</a>
          <a href={studioUrl}>Studio</a>
          <a href="/metrics" target="_blank" rel="noreferrer">
            /metrics
          </a>
          {gate === "ready" ? (
            <button type="button" className="linkish" onClick={logout}>
              Sign out
            </button>
          ) : null}
        </nav>
      </header>

      <main>
        <section className="hero" aria-label="Fleet overview">
          <BrandMark size="hero" />
          <p className="hero-lede">
            Operator view for a single synkd fleet — live rooms, health, and
            access. Guests stay in Studio.
          </p>
          <div className="cta-row">
            <StatusDot
              state={fleetState}
              label={
                fleetState === "up"
                  ? `fleet up · ${health?.rooms ?? 0} rooms · ${health?.connections ?? 0} sockets`
                  : fleetState === "checking"
                    ? "checking fleet…"
                    : error ?? "fleet offline"
              }
            />
            <a className="btn btn-primary" href={studioUrl}>
              Open Studio
            </a>
          </div>
        </section>

        {gate === "login" ? (
          <section className="panel" aria-label="Admin sign-in">
            <h2>Access</h2>
            <p className="muted">
              Enter the fleet admin token from{" "}
              <code>synkd.json</code> (<code>auth.adminToken</code>).
            </p>
            <form className="login" onSubmit={(e) => void onLogin(e)}>
              <label>
                Admin token
                <input
                  className="field"
                  type="password"
                  autoComplete="current-password"
                  value={tokenDraft}
                  onChange={(e) => setTokenDraft(e.target.value)}
                  placeholder="dev-admin"
                  required
                />
              </label>
              <button type="submit" className="btn btn-primary">
                Enter console
              </button>
            </form>
            {error ? <p className="err">{error}</p> : null}
          </section>
        ) : null}

        {gate === "ready" && health ? (
          <>
            <section className="panel" id="fleet" aria-label="Fleet">
              <h2>Fleet</h2>
              <dl className="facts">
                <div>
                  <dt>Version</dt>
                  <dd>{health.version ?? "—"}</dd>
                </div>
                <div>
                  <dt>Uptime</dt>
                  <dd>{formatUptime(health.uptimeMs)}</dd>
                </div>
                <div>
                  <dt>Tenant</dt>
                  <dd>{health.fleet?.tenantId ?? "default"}</dd>
                </div>
                <div>
                  <dt>Runtime</dt>
                  <dd>{caps?.runtime ?? "node"}</dd>
                </div>
              </dl>
              {caps ? (
                <p className="caps">
                  {[
                    caps.alarms && "alarms",
                    caps.hibernation && "hibernate",
                    caps.metrics && "metrics",
                    caps.yjs && "yjs",
                    caps.celld?.getTags && "celld-tags",
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              ) : null}
            </section>

            <section className="panel" id="rooms" aria-label="Rooms">
              <h2>Rooms</h2>
              {rooms.length === 0 ? (
                <p className="muted">No warm rooms. Open Studio to activate one.</p>
              ) : (
                <table className="rooms">
                  <thead>
                    <tr>
                      <th>Party</th>
                      <th>Room</th>
                      <th>Sockets</th>
                      <th>Idle</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {rooms.map((row) => (
                      <tr key={`${row.party}/${row.room}`}>
                        <td>
                          <code>{row.party}</code>
                        </td>
                        <td>
                          <code>{row.room}</code>
                        </td>
                        <td>{row.connections}</td>
                        <td>{idleLabel(row.lastActive)}</td>
                        <td className="actions">
                          <a
                            className="btn btn-ghost"
                            href={`${studioUrl}/?room=${encodeURIComponent(row.room)}&backend=node&surface=${row.party === "docs" ? "pad" : "chat"}`}
                          >
                            Open
                          </a>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            disabled={busy === `${row.party}/${row.room}`}
                            onClick={() => void hibernate(row.party, row.room)}
                          >
                            Hibernate
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <section className="panel" id="observability" aria-label="Observability">
              <h2>Observability</h2>
              <p className="muted">
                Counters from <code>/v1/health</code>. Scrape Prometheus at{" "}
                <a href="/metrics">/metrics</a>.
              </p>
              <dl className="facts">
                {Object.entries(health.metrics ?? {}).map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
              {metricsPreview ? (
                <pre className="metrics-preview">{metricsPreview}</pre>
              ) : null}
            </section>

            <section className="panel" id="access" aria-label="Access">
              <h2>Access</h2>
              <p className="muted">
                Guest clients use <code>auth.token</code>. This console uses{" "}
                <code>auth.adminToken</code> (Bearer). Rotate tokens in{" "}
                <code>synkd.json</code> — secrets are not shown after sign-in.
              </p>
              <button type="button" className="btn btn-ghost" onClick={logout}>
                Clear session token
              </button>
            </section>
          </>
        ) : null}

        {gate === "error" ? (
          <section className="panel">
            <h2>Cannot reach fleet</h2>
            <p className="err">{error}</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void refresh()}
            >
              Retry
            </button>
          </section>
        ) : null}
      </main>

      <p className="foot">
        synkd console ·{" "}
        <a href="http://127.0.0.1:5180/operators/">operator docs</a>
      </p>
    </div>
  );
}
