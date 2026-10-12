import { useEffect, useMemo, useRef, useState } from "react";
import { WS_CLOSE_SERVICE_RESTART } from "@synkd/client";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";

type ConnState = "connecting" | "connected" | "disconnected";

interface PadProps {
  host: string;
  room: string;
  token: string;
  displayName?: string;
  backend?: "node" | "durable";
  onLeave: () => void;
}

function wsBase(host: string): string {
  const proto =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "wss"
      : "ws";
  return `${proto}://${host}/parties/docs`;
}

export function Pad({
  host,
  room,
  token,
  displayName,
  backend = "node",
  onLeave,
}: PadProps) {
  const [status, setStatus] = useState<ConnState>("connecting");
  const [text, setText] = useState("");
  const [peers, setPeers] = useState<string[]>([]);
  const [serviceRestart, setServiceRestart] = useState(false);
  const [reconnectNonce, setReconnectNonce] = useState(0);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const ytextRef = useRef<Y.Text | null>(null);
  const applyingRef = useRef(false);

  const name = useMemo(
    () => displayName?.trim() || `anon-${Math.floor(Math.random() * 90 + 10)}`,
    [displayName],
  );

  useEffect(() => {
    const doc = new Y.Doc();
    const ytext = doc.getText("pad");
    ytextRef.current = ytext;

    const provider = new WebsocketProvider(wsBase(host), room, doc, {
      params: { token },
      // Studio already has one tab; avoid double-apply via BroadcastChannel.
      disableBc: true,
    });

    setStatus("connecting");

    const syncUi = () => {
      applyingRef.current = true;
      setText(ytext.toString());
      applyingRef.current = false;
    };
    syncUi();
    ytext.observe(syncUi);

    const onStatus = (event: { status: string }) => {
      if (event.status === "connected") {
        setServiceRestart(false);
        setStatus("connected");
      } else if (event.status === "disconnected") setStatus("disconnected");
      else setStatus("connecting");
    };
    provider.on("status", onStatus);

    const onWsClose = (event: CloseEvent) => {
      if (event.code === WS_CLOSE_SERVICE_RESTART) setServiceRestart(true);
    };
    const bindWs = () => {
      provider.ws?.addEventListener("close", onWsClose);
    };
    bindWs();
    provider.on("status", bindWs);

    provider.awareness.setLocalStateField("user", { name });
    const syncPeers = () => {
      const names: string[] = [];
      provider.awareness.getStates().forEach((state, clientId) => {
        if (clientId === doc.clientID) return;
        const user = state.user as { name?: string } | undefined;
        names.push(user?.name || `peer-${clientId}`);
      });
      setPeers(names);
    };
    syncPeers();
    provider.awareness.on("change", syncPeers);

    return () => {
      ytext.unobserve(syncUi);
      provider.awareness.off("change", syncPeers);
      provider.off("status", onStatus);
      provider.off("status", bindWs);
      provider.ws?.removeEventListener("close", onWsClose);
      provider.destroy();
      doc.destroy();
      ytextRef.current = null;
    };
  }, [host, room, token, name, reconnectNonce]);

  function onChange(value: string) {
    setText(value);
    if (applyingRef.current) return;
    const ytext = ytextRef.current;
    if (!ytext) return;
    const current = ytext.toString();
    if (current === value) return;
    // Full replace keeps the demo simple; fine for short pads.
    ytext.delete(0, current.length);
    if (value.length > 0) ytext.insert(0, value);
  }

  return (
    <>
      {status === "disconnected" ? (
        <div
          className={`banner ${serviceRestart ? "banner-info" : "banner-warn"}`}
          role="alert"
        >
          {serviceRestart
            ? "Runtime restarted (close 1012). Pad will resync on reconnect."
            : "Pad disconnected. Reconnect to resume sync."}
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
          pad <strong>{room}</strong>
          <span className="room-stat"> · {backend}</span>
          <span className="room-stat"> · /parties/docs</span>
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
        <div className="roster" aria-label="Collaborators">
          <span className="pill" title="you">
            {name}
          </span>
          {peers.map((peer) => (
            <span className="pill" key={peer}>
              {peer}
            </span>
          ))}
        </div>
        <button type="button" className="btn btn-ghost" onClick={onLeave}>
          Leave
        </button>
      </div>

      <label className="pad-label" htmlFor="synkd-pad">
        Shared notepad
      </label>
      <textarea
        id="synkd-pad"
        ref={areaRef}
        className="pad-area"
        value={text}
        onChange={(e) => onChange(e.target.value)}
        placeholder={
          status === "connected"
            ? "Type here — opens in another tab sync live."
            : "Connecting…"
        }
        disabled={status !== "connected"}
        spellCheck
        rows={14}
      />
    </>
  );
}