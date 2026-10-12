/**
 * celld / workerd Worker entry.
 * Local DX: `sinkd dev` loads Chat via @sinkd/runtime.
 * Fleet: `celld deploy` runs this Worker with Durable Object bindings.
 */
import { createDurableParty, routeSinkdRequest } from "@sinkd/adapter-celld";
import { createLobbyAuth } from "@sinkd/auth";
import { Chat } from "./chat.js";

export const ChatDO = createDurableParty(Chat);

const lobby = createLobbyAuth({ token: "dev-token" });

export default {
  async fetch(
    request: Request,
    env: Record<string, unknown>,
  ): Promise<Response> {
    return (
      (await routeSinkdRequest(request, env as never, {
        bindings: { main: "ChatDO" },
        onBeforeConnect: lobby,
        onBeforeRequest: lobby,
      })) ?? new Response("Not Found", { status: 404 })
    );
  },
};