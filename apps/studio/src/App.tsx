import { useMemo, useState } from "react";
import { Room } from "./Room";

const DEFAULT_TOKEN = "dev-token";

function randomRoom(): string {
  const adjectives = ["brine", "coral", "drift", "kelp", "tidal", "abyss"];
  const nouns = ["hall", "bay", "well", "cell", "node", "sink"];
  const a = adjectives[Math.floor(Math.random() * adjectives.length)] ?? "brine";
  const n = nouns[Math.floor(Math.random() * nouns.length)] ?? "hall";
  return `${a}-${n}-${Math.floor(Math.random() * 90 + 10)}`;
}

export function App() {
  const [room, setRoom] = useState(() => randomRoom());
  const [joined, setJoined] = useState(false);
  const [name, setName] = useState("");
  const host = useMemo(() => {
    if (typeof window === "undefined") return "127.0.0.1:8787";
    // Prefer same-origin proxy in Vite; fall back to direct runtime.
    return window.location.host.includes("5173")
      ? window.location.host
      : "127.0.0.1:8787";
  }, []);

  return (
    <div className="shell">
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
        <div className="brand">
          sink<span>d</span>
          <span className="brand-meta">self-hosted rooms</span>
        </div>
        <nav className="top-links">
          <a href="https://docs.partykit.io/" target="_blank" rel="noreferrer">
            PartyKit model
          </a>
          <a href="https://celld.dev/docs/" target="_blank" rel="noreferrer">
            celld
          </a>
          <a href="https://github.com/denoland/celld" target="_blank" rel="noreferrer">
            GitHub
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
                onClick={() => setJoined(true)}
              >
                Open a room
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setJoined(false);
                  setRoom(randomRoom());
                }}
              >
                New room
              </button>
            )}
            <a className="btn btn-ghost" href="#room">
              Live stage
            </a>
          </div>
        </section>

        <section className="room-stage" id="room" aria-label="Live room">
          {!joined ? (
            <form
              className="join-panel"
              onSubmit={(e) => {
                e.preventDefault();
                setJoined(true);
              }}
            >
              <label>
                Display name
                <input
                  className="field"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="optional"
                  maxLength={32}
                />
              </label>
              <label>
                Room id
                <input
                  className="field"
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  required
                />
              </label>
              <button type="submit" className="btn btn-primary">
                Enter room
              </button>
            </form>
          ) : (
            <Room
              host={host}
              room={room}
              token={DEFAULT_TOKEN}
              displayName={name || undefined}
              onLeave={() => setJoined(false)}
            />
          )}
        </section>
      </main>

      <p className="foot">
        /parties/main/{room || "…"} · Node runtime locally · celld fleets via Docker
      </p>
    </div>
  );
}