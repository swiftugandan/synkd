import { Server, type Connection } from "@synkd/server";

/**
 * Lightweight presence party — one room tracks who is online.
 * Chat can compose via env.PresenceDO.getByName(room).fetch(...).
 */
export class Presence extends Server {
  override getConnectionTags(): string[] {
    return ["presence"];
  }

  override onConnect(conn: Connection): void {
    this.#broadcastRoster("joined", conn.id);
  }

  override onClose(conn: Connection): void {
    this.#broadcastRoster("left", conn.id);
  }

  override async onMessage(
    sender: Connection,
    message: string | ArrayBuffer,
  ): Promise<void> {
    if (typeof message !== "string") return;
    try {
      const parsed = JSON.parse(message) as { type?: string; name?: string };
      if (parsed.type === "presence" && parsed.name) {
        sender.setState({ name: parsed.name.slice(0, 32) });
        this.#broadcastRoster("rename", sender.id);
      }
    } catch {
      // ignore
    }
  }

  override async onRequest(request: Request): Promise<Response> {
    if (request.method === "GET") {
      return Response.json({
        ok: true,
        room: this.name,
        party: "presence",
        roster: this.#roster(),
      });
    }
    if (request.method === "POST") {
      const body = (await request.json().catch(() => ({}))) as {
        id?: string;
        name?: string;
      };
      return Response.json({
        ok: true,
        acknowledged: body,
        roster: this.#roster(),
      });
    }
    return new Response("Method Not Allowed", { status: 405 });
  }

  #roster() {
    return [...this.getConnections()].map((c) => ({
      id: c.id,
      name: (c.state as { name?: string } | null)?.name,
    }));
  }

  #broadcastRoster(text: string, from: string) {
    this.broadcast(
      JSON.stringify({
        type: "system",
        text,
        from,
        roster: this.#roster(),
        at: Date.now(),
      }),
    );
  }
}

export default Presence;