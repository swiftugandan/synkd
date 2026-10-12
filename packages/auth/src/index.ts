import { SignJWT, jwtVerify } from "jose";
import { SynkdError, SynkdErrorCode } from "@synkd/contracts";

function secretKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export interface SynkdTokenClaims {
  sub: string;
  room?: string;
  party?: string;
  name?: string;
  role?: string;
}

export interface LobbyAuthOptions {
  /** Shared bearer / query token (dev). */
  token?: string;
  /** HS256 secret for JWT query/header auth. */
  jwtSecret?: string;
  /** Allowed browser Origins; empty = allow all. */
  origins?: string[];
}

const USER_HEADER = "x-synkd-user";
const NAME_HEADER = "x-synkd-name";

export { USER_HEADER, NAME_HEADER };

export async function signSynkdToken(
  secret: string,
  claims: SynkdTokenClaims,
  expiresIn = "2h",
): Promise<string> {
  return new SignJWT({
    room: claims.room,
    party: claims.party,
    name: claims.name,
    role: claims.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey(secret));
}

export async function verifySynkdToken(
  secret: string,
  token: string,
): Promise<SynkdTokenClaims> {
  const { payload } = await jwtVerify(token, secretKey(secret));
  if (!payload.sub) {
    throw new SynkdError(SynkdErrorCode.UNAUTHORIZED, "JWT missing sub", 401);
  }
  return {
    sub: payload.sub,
    room: typeof payload.room === "string" ? payload.room : undefined,
    party: typeof payload.party === "string" ? payload.party : undefined,
    name: typeof payload.name === "string" ? payload.name : undefined,
    role: typeof payload.role === "string" ? payload.role : undefined,
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
        const claims = await verifySynkdToken(options.jwtSecret, presented);
        return stamp(req, claims);
      } catch {
        return new Response("Unauthorized", { status: 401 });
      }
    }

    return new Response("Unauthorized", { status: 401 });
  };
}

function stamp(req: Request, claims: SynkdTokenClaims): Request {
  const headers = new Headers(req.headers);
  headers.set(USER_HEADER, claims.sub);
  if (claims.name) headers.set(NAME_HEADER, claims.name);
  if (claims.role) headers.set("x-synkd-role", claims.role);
  return new Request(req, { headers });
}

export interface AdminAuthOptions {
  /** Shared admin bearer token. */
  token?: string;
  /** HS256 secret; JWT must include role matching adminRole. */
  jwtSecret?: string;
  adminRole?: string;
  origins?: string[];
}

/**
 * Gate for /v1 control API. Rejects unless admin token or JWT role=admin.
 */
export function createAdminAuth(options: AdminAuthOptions) {
  const adminRole = options.adminRole ?? "admin";
  return async (req: Request): Promise<Response | Request | void> => {
    if (options.origins && options.origins.length > 0) {
      const origin = req.headers.get("Origin");
      if (origin && !options.origins.includes(origin)) {
        return new Response("Origin not allowed", { status: 403 });
      }
    }

    const header = req.headers.get("Authorization");
    const bearer = header?.startsWith("Bearer ")
      ? header.slice("Bearer ".length)
      : null;
    const queryToken = new URL(req.url).searchParams.get("token");
    const presented = bearer ?? queryToken;

    if (!options.token && !options.jwtSecret) {
      return new Response("Admin auth not configured", { status: 503 });
    }

    if (!presented) {
      return new Response("Unauthorized", { status: 401 });
    }

    if (options.token && presented === options.token) {
      return stamp(req, { sub: "admin-token", role: adminRole });
    }

    if (options.jwtSecret) {
      try {
        const claims = await verifySynkdToken(options.jwtSecret, presented);
        if (claims.role !== adminRole) {
          return new Response("Forbidden", { status: 403 });
        }
        return stamp(req, claims);
      } catch {
        return new Response("Unauthorized", { status: 401 });
      }
    }

    return new Response("Unauthorized", { status: 401 });
  };
}