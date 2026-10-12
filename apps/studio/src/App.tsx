import { useMemo, useState } from "react";
import { HealthStrip } from "./HealthStrip";
import { Pad } from "./Pad";
import { Room } from "./Room";

const DEFAULT_TOKEN = "dev-token";

type Backend = "node" | "celld";
type Surface = "chat" | "pad";

function randomRoom(): string {
  const adjectives = ["brine", "coral", "drift", "kelp", "tidal", "abyss"];
  const nouns = ["hall", "bay", "well", "cell", "node", "sink"];
  const a = adjectives[Math.floor(Math.random() * adjectives.length)] ?? "brine";
  const n = nouns[Math.floor(Math.random() * nouns.length)] ?? "hall";
  return `${a}-${n}-${Math.floor(Math.random() * 90 + 10)}`;
}

function readQuery(): {
  room?: string;
  backend?: Backend;
  name?: string;
  surface?: Surface;
} {
  if (typeof window === "undefined") return {};
  const q = new URLSearchParams(window.location.search);
  const backend = q.get("backend");
  const surface = q.get("surface");
  return {
    room: q.get("room") ?? undefined,
    name: q.get("name") ?? undefined,
    backend: backend === "celld" || backend === "node" ? backend : undefined,
    surface: surface === "pad" || surface === "chat" ? surface : undefined,
  };
}

function studioHost(backend: Backend): string {
  if (typeof window === "undefined") {
    return backend === "celld" ? "127.0.0.1:9876" : "127.0.0.1:8787";
  }
  if (backend === "celld") return "127.0.0.1:9876";
  const { host, port } = window.location;
  // Vite (517x) and Playwright preview (417x) proxy /parties → runtime
  if (port.startsWith("517") || port.startsWith("417")) return host;
  return "127.0.0.1:8787";
}

export function App() {
  const initial = useMemo(() => readQuery(), []);
  const [room, setRoom] = useState(() => initial.room || randomRoom());
  const [joined, setJoined] = useState(() => Boolean(initial.room));
  const [name, setName] = useState(initial.name ?? "");
  const [backend, setBackend] = useState<Backend>(initial.backend ?? "node");
  const [surface, setSurface] = useState<Surface>(initial.surface ?? "chat");
  const [copied, setCopied] = useState(false);
  const host = useMemo(() => studioHost(backend), [backend]);

  function syncUrl(next: {
    room: string;
    backend: Backend;
    name: string;
    joined: boolean;
    surface: Surface;
  }) {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (next.joined) url.searchParams.set("room", next.room);
    else url.searchParams.delete("room");
    url.searchParams.set("backend", next.backend);
    url.searchParams.set("surface", next.surface);
    if (next.name) url.searchParams.set("name", next.name);
    else url.searchParams.delete("name");
    window.history.replaceState({}, "", url);
  }

  async function copyInvite() {
    const url = new URL(window.location.href);
    url.searchParams.set("room", room);
    url.searchParams.set("backend", backend);
    url.searchParams.set("surface", surface);
    if (name) url.searchParams.set("name", name);
    await navigator.clipboard.writeText(url.toString());
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  const partyPath = surface === "pad" ? "docs" : "main";

  return (
    <div className="shell">
      <a className="skip-link" href="#room">
        Skip to room
      </a>

      <div className="wave" aria-hidden="true">
        <svg viewBox="0 0 1440 320" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M0 220 C 180 160 320 280 520 230 C 740 170 860 120 1080 180 C 1240 220 1360 210 1440 170 L1440 320 L0 320 Z"
            fill="url(#g)"
            opacity="0.55"
          />
          <path
            d="M0 250 C 220 200 360 300 560 250 C 780 190 920 150 1120 210 C 1280 250 1380 240 1440 210 L1440 320 L0 320 Z"
            fill="#2AD4C0"
            opacity="0.08"
          />
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#2AD4C0" stopOpacity="0.35" />
              <stop offset="1" stopColor="#123447" stopOpacity="0.1" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <header className="topbar">
        <div className="brand" aria-label="synkd">
          synk<span>d</span>
          <span className="brand-meta">self-hosted rooms</span>
        </div>
        <nav className="top-links" aria-label="References">
          <a href="http://127.0.0.1:5180/">Docs</a>
          <a href="http://127.0.0.1:5174/">Console</a>
          <a href="https://celld.dev/docs/" target="_blank" rel="noreferrer">
            celld
          </a>
        </nav>
      </header>

      <main className="hero">
        <section className="hero-copy">
          <h1>
            synk<span className="signal">d</span>
          </h1>
          <p>
            PartyKit-shaped rooms on machines you own. Sticky actors, durable
            storage, and partysocket — without the hosted cloud.
          </p>
          <div className="cta-row">
            {!joined ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setJoined(true);
                  syncUrl({ room, backend, name, joined: true, surface });
                }}
              >
                Open a room
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    const next = randomRoom();
                    setJoined(false);
                    setRoom(next);
                    syncUrl({
                      room: next,
                      backend,
                      name,
                      joined: false,
                      surface,
                    });
                  }}
                >
                  New room
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => void copyInvite()}
                >
                  {copied ? "Link copied" : "Copy invite"}
                </button>
              </>
            )}
            <a className="btn btn-ghost" href="#room">
              Live stage
            </a>
          </div>
          <p className="hero-protocol">
            <code>
              /parties/{partyPath}/{room}
            </code>
            <span className="hero-backend"> via {backend}</span>
          </p>
          <HealthStrip backend={backend} />
        </section>

        <section className="room-stage" id="room" aria-label="Live room">
          {!joined ? (
            <form
              className="join-panel"
              onSubmit={(e) => {
                e.preventDefault();
                setJoined(true);
                syncUrl({ room, backend, name, joined: true, surface });
              }}
            >
              <p className="join-lede">
                Enter a room id. Open the same invite link in another tab to see
                broadcast fan-out.
              </p>
              <fieldset className="backend-field">
                <legend>Surface</legend>
                <label className="backend-option">
                  <input
                    type="radio"
                    name="surface"
                    checked={surface === "chat"}
                    onChange={() => {
                      setSurface("chat");
                      syncUrl({ room, backend, name, joined, surface: "chat" });
                    }}
                  />
                  Chat
                </label>
                <label className="backend-option">
                  <input
                    type="radio"
                    name="surface"
                    checked={surface === "pad"}
                    onChange={() => {
                      setSurface("pad");
                      syncUrl({ room, backend, name, joined, surface: "pad" });
                    }}
                  />
                  Pad <span className="muted">Yjs</span>
                </label>
              </fieldset>
              <fieldset className="backend-field">
                <legend>Runtime</legend>
                <label className="backend-option">
                  <input
                    type="radio"
                    name="backend"
                    checked={backend === "node"}
                    onChange={() => {
                      setBackend("node");
                      syncUrl({ room, backend: "node", name, joined, surface });
                    }}
                  />
                  Node <span className="muted">:8787</span>
                </label>
                <label className="backend-option">
                  <input
                    type="radio"
                    name="backend"
                    checked={backend === "celld"}
                    onChange={() => {
                      setBackend("celld");
                      syncUrl({
                        room,
                        backend: "celld",
                        name,
                        joined,
                        surface,
                      });
                    }}
                  />
                  celld <span className="muted">:9876</span>
                </label>
              </fieldset>
              <label>
                Display name
                <input
                  className="field"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="optional"
                  maxLength={32}
                  autoComplete="nickname"
                />
              </label>
              <label>
                Room id
                <input
                  className="field"
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  required
                  spellCheck={false}
                  autoCapitalize="off"
                />
              </label>
              <button type="submit" className="btn btn-primary">
                Enter room
              </button>
            </form>
          ) : surface === "pad" ? (
            <Pad
              key={`pad:${backend}:${room}`}
              host={host}
              room={room}
              token={DEFAULT_TOKEN}
              displayName={name || undefined}
              backend={backend}
              onLeave={() => {
                setJoined(false);
                syncUrl({ room, backend, name, joined: false, surface });
              }}
            />
          ) : (
            <Room
              key={`chat:${backend}:${room}`}
              host={host}
              room={room}
              token={DEFAULT_TOKEN}
              displayName={name || undefined}
              backend={backend}
              onLeave={() => {
                setJoined(false);
                syncUrl({ room, backend, name, joined: false, surface });
              }}
            />
          )}
        </section>
      </main>

      <p className="foot">
        {backend === "celld"
          ? "celld via Podman/Docker (pnpm celld:dev · pnpm celld:stop)"
          : "Node runtime locally"}{" "}
        · host {host}
        {" · "}
        <a href="http://127.0.0.1:5174/">console</a>
        {" · "}
        <a href="http://127.0.0.1:5180/">docs</a>
      </p>
    </div>
  );
}