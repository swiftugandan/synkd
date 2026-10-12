import { Server, type Connection } from "@sinkd/server";

type ChatInbound =
  | { type: "chat"; text: string; name?: string }
  | { type: "presence"; name: string };

type PartyEnv = {
  PresenceDO?: {
    getByName(name: string): {
      fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
    };
  };
};

export class Chat extends Server<PartyEnv> {
  static options = { hibernate: true };

  override getConnectionTags(): string[] {
    return ["chat"];
  }

  override async onStart(): Promise<void> {
    const existing = await this.storage.get<number>("messageCount");
    if (existing === undefined) {
      await this.storage.put("messageCount", 0);
    }
  }

  async #notifyPresence(payload: Record<string, unknown>): Promise<void> {
    const stub = this.env.PresenceDO?.getByName(this.name);
    if (!stub) return;
    try {
      await stub.fetch(`http://party/presence/${this.name}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      // presence is best-effort composition
    }
  }

  override onConnect(conn: Connection): void {
    const roster = [...this.getConnections()].map((c) => ({
      id: c.id,
      name: (c.state as { name?: string } | null)?.name,
    }));
    this.broadcast(
      JSON.stringify({
        type: "system",
        text: "joined",
        from: conn.id,
        roster,
        at: Date.now(),
      }),
    );
    void this.#notifyPresence({ id: conn.id, event: "joined" });
  }

  override onClose(conn: Connection): void {
    const roster = [...this.getConnections()]
      .filter((c) => c.id !== conn.id)
      .map((c) => ({
        id: c.id,
        name: (c.state as { name?: string } | null)?.name,
      }));
    this.broadcast(
      JSON.stringify({
        type: "system",
        text: "left",
        from: conn.id,
        roster,
        at: Date.now(),
      }),
    );
  }

  override async onMessage(
    sender: Connection,
    message: string | ArrayBuffer,
  ): Promise<void> {
    if (typeof message !== "string") return;
    let parsed: ChatInbound;
    try {
      parsed = JSON.parse(message) as ChatInbound;
    } catch {
      return;
    }

    if (parsed.type === "presence" && parsed.name) {
      sender.setState({ name: parsed.name.slice(0, 32) });
      const roster = [...this.getConnections()].map((c) => ({
        id: c.id,
        name: (c.state as { name?: string } | null)?.name,
      }));
      this.broadcast(
        JSON.stringify({
          type: "presence",
          roster,
          at: Date.now(),
        }),
      );
      return;
    }

    if (parsed.type === "chat" && parsed.text?.trim()) {
      const count = (await this.storage.get<number>("messageCount")) ?? 0;
      await this.storage.put("messageCount", count + 1);
      const name =
        parsed.name?.slice(0, 32) ||
        (sender.state as { name?: string } | null)?.name ||
        sender.id.slice(0, 6);
      this.broadcast(
        JSON.stringify({
          type: "chat",
          text: parsed.text.slice(0, 2000),
          name,
          from: sender.id,
          at: Date.now(),
          n: count + 1,
        }),
      );
    }
  }

  override async onRequest(request: Request): Promise<Response> {
    if (request.method === "GET") {
      return Response.json({
        ok: true,
        room: this.name,
        connections: this.connections.size,
        messageCount: (await this.storage.get<number>("messageCount")) ?? 0,
      });
    }
    return new Response("Method Not Allowed", { status: 405 });
  }
}

export default Chat;