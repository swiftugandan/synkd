import { SignJWT, jwtVerify } from "jose";
import { SinkdError, SinkdErrorCode } from "@sinkd/contracts";

function secretKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export interface SinkdTokenClaims {
  sub: string;
  room?: string;
  party?: string;
  name?: string;
}

export interface LobbyAuthOptions {
  /** Shared bearer / query token (dev). */
  token?: string;
  /** HS256 secret for JWT query/header auth. */
  jwtSecret?: string;
  /** Allowed browser Origins; empty = allow all. */
  origins?: string[];
}

const USER_HEADER = "x-sinkd-user";
const NAME_HEADER = "x-sinkd-name";

export { USER_HEADER, NAME_HEADER };

export async function signSinkdToken(
  secret: string,
  claims: SinkdTokenClaims,
  expiresIn = "2h",
): Promise<string> {
  return new SignJWT({
    room: claims.room,
    party: claims.party,
    name: claims.name,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey(secret));
}

export async function verifySinkdToken(
  secret: string,
  token: string,
): Promise<SinkdTokenClaims> {
  const { payload } = await jwtVerify(token, secretKey(secret));
  if (!payload.sub) {
    throw new SinkdError(SinkdErrorCode.UNAUTHORIZED, "JWT missing sub", 401);
  }
  return {
    sub: payload.sub,
    room: typeof payload.room === "string" ? payload.room : undefined,
    party: typeof payload.party === "string" ? payload.party : undefined,
    name: typeof payload.name === "string" ? payload.name : undefined,
  };
}

/**
 * PartyServer-style lobby gate. Returns a Response to reject, a Request with
 * identity headers stamped, or void to continue unchanged.
 */
export function createLobbyAuth(options: LobbyAuthOptions) {
  return async (req: Request): Promise<Response | Request | void> => {
    if (options.origins && options.origins.length > 0) {
      const origin = req.headers.get("Origin");
      if (origin && !options.origins.includes(origin)) {
        return new Response("Origin not allowed", { status: 403 });
      }
    }

    const url = new URL(req.url);
    const queryToken = url.searchParams.get("token");
    const header = req.headers.get("Authorization");
    const bearer = header?.startsWith("Bearer ")
      ? header.slice("Bearer ".length)
      : null;
    const presented = bearer ?? queryToken;

    if (!options.token && !options.jwtSecret) {
      return;
    }

    if (!presented) {
      return new Response("Unauthorized", { status: 401 });
    }

    if (options.token && presented === options.token) {
      return stamp(req, { sub: "shared-token" });
    }

    if (options.jwtSecret) {
      try {
        const claims = await verifySinkdToken(options.jwtSecret, presented);
        return stamp(req, claims);
      } catch {
        return new Response("Unauthorized", { status: 401 });
      }
    }

    return new Response("Unauthorized", { status: 401 });
  };
}

function stamp(req: Request, claims: SinkdTokenClaims): Request {
  const headers = new Headers(req.headers);
  headers.set(USER_HEADER, claims.sub);
  if (claims.name) headers.set(NAME_HEADER, claims.name);
  return new Request(req, { headers });
}