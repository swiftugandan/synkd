/**
 * celld / workerd Worker entry.
 * Local DX: `synkd dev` loads parties via @synkd/runtime.
 * Fleet: `celld deploy` runs this Worker with Durable Object bindings.
 */
import { createDurableParty, routeSynkdRequest } from "@synkd/adapter-celld";
import { createLobbyAuth } from "@synkd/auth";
import { Chat } from "./chat.js";
import { Docs } from "./docs.js";
import { Presence } from "./presence.js";

export const ChatDO = createDurableParty(Chat);
export const PresenceDO = createDurableParty(Presence);
export const DocsDO = createDurableParty(Docs);

const lobby = createLobbyAuth({ token: "dev-token" });

export default {
  async fetch(
    request: Request,
    env: Record<string, unknown>,
  ): Promise<Response> {
    return (
      (await routeSynkdRequest(request, env as never, {
        bindings: {
          main: "ChatDO",
          presence: "PresenceDO",
          docs: "DocsDO",
        },
        onBeforeConnect: lobby,
        onBeforeRequest: lobby,
      })) ?? new Response("Not Found", { status: 404 })
    );
  },
};