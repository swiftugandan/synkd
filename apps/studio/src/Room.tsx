import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  createSinkdSocket,
  WS_CLOSE_SERVICE_RESTART,
} from "@sinkd/client";

type RosterEntry = { id: string; name?: string };

type ChatMessage =
  | {
      type: "chat";
      text: string;
      name: string;
      from: string;
      at: number;
      n?: number;
    }
  | {
      type: "system";
      text: string;
      from?: string;
      roster?: RosterEntry[];
      at: number;
    }
  | {
      type: "presence";
      roster: RosterEntry[];
      at: number;
    };

type ConnState = "connecting" | "connected" | "disconnected";

interface RoomProps {
  host: string;
  room: string;
  token: string;
  displayName?: string;
  backend?: "node" | "celld";
  onLeave: () => void;
}

export function Room({
  host,
  room,
  token,
  displayName,
  backend = "node",
  onLeave,
}: RoomProps) {
  const [status, setStatus] = useState<ConnState>("connecting");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [draft, setDraft] = useState("");
  const [name, setName] = useState(displayName ?? "");
  const [messageCount, setMessageCount] = useState(0);
  const [lastHeartbeat, setLastHeartbeat] = useState<number | null>(null);
  const [serviceRestart, setServiceRestart] = useState(false);
  const [reconnectNonce, setReconnectNonce] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<ReturnType<typeof createSinkdSocket> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const socket = createSinkdSocket({
      host,
      room,
      party: "main",
      query: { token },
    });
    socketRef.current = socket;
    setStatus("connecting");

    const onOpen = () => {
      setServiceRestart(false);
      setStatus("connected");
      if (displayName) {
        socket.send(JSON.stringify({ type: "presence", name: displayName }));
      }
      window.requestAnimationFrame(() => inputRef.current?.focus());
    };
    const onClose = (event: CloseEvent) => {
      if (event.code === WS_CLOSE_SERVICE_RESTART) setServiceRestart(true);
      setStatus("disconnected");
    };
    const onMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(String(event.data)) as ChatMessage;
        if (data.type === "presence") {
          setRoster(data.roster);
          return;
        }
        if (data.type === "system" && data.text === "heartbeat") {
          setLastHeartbeat(data.at);
          if (data.roster) setRoster(data.roster);
          return;
        }
        if (data.type === "system" && data.roster) {
          setRoster(data.roster);
        }
        if (data.type === "chat" && typeof data.n === "number") {
          setMessageCount(data.n);
        }
        setMessages((prev) => [...prev.slice(-200), data]);
      } catch {
        // ignore non-JSON frames
      }
    };

    socket.addEventListener("open", onOpen);
    socket.addEventListener("close", onClose);
    socket.addEventListener("message", onMessage);

    return () => {
      socket.removeEventListener("open", onOpen);
      socket.removeEventListener("close", onClose);
      socket.removeEventListener("message", onMessage);
      socket.close();
      socketRef.current = null;
    };
  }, [host, room, token, displayName, reconnectNonce]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  function sendChat(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !socketRef.current || status !== "connected") return;
    socketRef.current.send(
      JSON.stringify({
        type: "chat",
        text,
        name: name || undefined,
      }),
    );
    setDraft("");
  }

  function updatePresence() {
    if (!socketRef.current || status !== "connected" || !name.trim()) return;
    socketRef.current.send(
      JSON.stringify({ type: "presence", name: name.trim() }),
    );
  }

  return (
    <>
      {status === "disconnected" ? (
        <div
          className={`banner ${serviceRestart ? "banner-info" : "banner-warn"}`}
          role="alert"
        >
          {serviceRestart
            ? "Runtime restarted (close 1012). Reconnecting restores the sticky room."
            : "Connection lost. Messages will not deliver until you reconnect."}
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setReconnectNonce((n) => n + 1)}
          >
            Reconnect
          </button>
        </div>
      ) : null}

      <div className="room-toolbar">
        <div className="room-id">
          room <strong>{room}</strong>
          <span className="room-stat"> · {backend}</span>
          {messageCount > 0 ? (
            <span className="room-stat"> · {messageCount} persisted</span>
          ) : null}
          {roster.length > 0 ? (
            <span className="room-stat"> · {roster.length} online</span>
          ) : null}
          {lastHeartbeat ? (
            <span className="room-stat" title={new Date(lastHeartbeat).toISOString()}>
              {" "}
              · hb {new Date(lastHeartbeat).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>
          ) : null}
        </div>
        <div
          className="status"
          data-state={status}
          role="status"
          aria-label="Connection"
        >
          <span className="status-dot" aria-hidden="true" />
          {status}
        </div>
        <div className="roster" aria-label="Connected peers">
          {roster.map((peer) => (
            <span className="pill" key={peer.id} title={peer.id}>
              {peer.name || peer.id.slice(0, 6)}
            </span>
          ))}
        </div>
        <button type="button" className="btn btn-ghost" onClick={onLeave}>
          Leave
        </button>
      </div>

      <div className="messages" ref={listRef} aria-live="polite">
        {messages.length === 0 ? (
          <div className="empty">
            <strong>Room is live</strong>
            Open this room id in another tab to watch messages fan out from
            one sticky actor.
          </div>
        ) : (
          messages.map((msg, index) => (
            <article
              className={`msg ${msg.type === "system" ? "system" : ""}`}
              key={`${msg.at}-${index}`}
            >
              <div className="msg-meta">
                <span className="name">
                  {msg.type === "chat"
                    ? msg.name
                    : msg.type === "system"
                      ? "system"
                      : "presence"}
                </span>
                <time dateTime={new Date(msg.at).toISOString()}>
                  {new Date(msg.at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </time>
              </div>
              <div className="msg-body">
                {msg.type === "chat"
                  ? msg.text
                  : msg.type === "system"
                    ? `${msg.from?.slice(0, 6) ?? ""} ${msg.text}`.trim()
                    : "roster updated"}
              </div>
            </article>
          ))
        )}
      </div>

      <form className="composer" onSubmit={sendChat}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={updatePresence}
          placeholder="name"
          maxLength={32}
          aria-label="Display name"
          autoComplete="nickname"
        />
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={
            status === "connected" ? "Message the room" : "Connecting…"
          }
          maxLength={2000}
          aria-label="Message"
          disabled={status !== "connected"}
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={status !== "connected" || draft.trim().length === 0}
        >
          Send
        </button>
      </form>
    </>
  );
}