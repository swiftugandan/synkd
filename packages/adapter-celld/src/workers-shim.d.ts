/** Cloudflare / celld WebSocket with hibernation accept(). */
interface WorkersWebSocket extends WebSocket {
  accept(): void;
}

interface WebSocketPair {
  0: WorkersWebSocket;
  1: WorkersWebSocket;
}

declare const WebSocketPair: {
  new (): WebSocketPair;
};