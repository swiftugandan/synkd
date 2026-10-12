import { useMemo, useState } from "react";
import { Room } from "./Room";

const DEFAULT_TOKEN = "dev-token";

type Backend = "node" | "celld";

function randomRoom(): string {
  const adjectives = ["brine", "coral", "drift", "kelp", "tidal", "abyss"];
  const nouns = ["hall", "bay", "well", "cell", "node", "sink"];
  const a = adjectives[Math.floor(Math.random() * adjectives.length)] ?? "brine";
  const n = nouns[Math.floor(Math.random() * nouns.length)] ?? "hall";
  return `${a}-${n}-${Math.floor(Math.random() * 90 + 10)}`;
}

function readQuery(): { room?: string; backend?: Backend; name?: string } {
  if (typeof window === "undefined") return {};
  const q = new URLSearchParams(window.location.search);
  const backend = q.get("backend");
  return {
    room: q.get("room") ?? undefined,
    name: q.get("name") ?? undefined,
    backend: backend === "celld" || backend === "node" ? backend : undefined,
  };
}

function studioHost(backend: Backend): string {
  if (typeof window === "undefined") {
    return backend === "celld" ? "127.0.0.1:9876" : "127.0.0.1:8787";
  }
  if (backend === "celld") return "127.0.0.1:9876";
  const { host, port } = window.location;
  if (port.startsWith("517")) return host;
  return "127.0.0.1:8787";
}

export function App() {
  const initial = useMemo(() => readQuery(), []);
  const [room, setRoom] = useState(() => initial.room || randomRoom());
  const [joined, setJoined] = useState(() => Boolean(initial.room));
  const [name, setName] = useState(initial.name ?? "");
  const [backend, setBackend] = useState<Backend>(initial.backend ?? "node");
  const [copied, setCopied] = useState(false);
  const host = useMemo(() => studioHost(backend), [backend]);

  function syncUrl(next: {
    room: string;
    backend: Backend;
    name: string;
    joined: boolean;
  }) {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (next.joined) url.searchParams.set("room", next.room);
    else url.searchParams.delete("room");
    url.searchParams.set("backend", next.backend);
    if (next.name) url.searchParams.set("name", next.name);
    else url.searchParams.delete("name");
    window.history.replaceState({}, "", url);
  }

  async function copyInvite() {
    const url = new URL(window.location.href);
    url.searchParams.set("room", room);
    url.searchParams.set("backend", backend);
    if (name) url.searchParams.set("name", name);
    await navigator.clipboard.writeText(url.toString());
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

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
        <div className="brand" aria-label="sinkd">
          sink<span>d</span>
          <span className="brand-meta">self-hosted rooms</span>
        </div>
        <nav className="top-links" aria-label="References">
          <a href="https://celld.dev/docs/" target="_blank" rel="noreferrer">
            celld
          </a>
          <a href="https://docs.partykit.io/" target="_blank" rel="noreferrer">
            PartyKit
          </a>
        </nav>
      </header>

      <main className="hero">
        <section className="hero-copy">
          <h1>
            sink<span className="signal">d</span>
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
                  syncUrl({ room, backend, name, joined: true });
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
              /parties/main/{room}
            </code>
            <span className="hero-backend"> via {backend}</span>
          </p>
        </section>

        <section className="room-stage" id="room" aria-label="Live room">
          {!joined ? (
            <form
              className="join-panel"
              onSubmit={(e) => {
                e.preventDefault();
                setJoined(true);
                syncUrl({ room, backend, name, joined: true });
              }}
            >
              <p className="join-lede">
                Enter a room id. Open the same invite link in another tab to see
                broadcast fan-out.
              </p>
              <fieldset className="backend-field">
                <legend>Runtime</legend>
                <label className="backend-option">
                  <input
                    type="radio"
                    name="backend"
                    checked={backend === "node"}
                    onChange={() => {
                      setBackend("node");
                      syncUrl({ room, backend: "node", name, joined });
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
                      syncUrl({ room, backend: "celld", name, joined });
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
          ) : (
            <Room
              key={`${backend}:${room}`}
              host={host}
              room={room}
              token={DEFAULT_TOKEN}
              displayName={name || undefined}
              backend={backend}
              onLeave={() => {
                setJoined(false);
                syncUrl({ room, backend, name, joined: false });
              }}
            />
          )}
        </section>
      </main>

      <p className="foot">
        {backend === "celld"
          ? "celld via Podman (pnpm celld:spike / SINKD_SPIKE_KEEP=1)"
          : "Node runtime locally"}{" "}
        · host {host}
      </p>
    </div>
  );
}