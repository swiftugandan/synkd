export type WSMessage = ArrayBuffer | ArrayBufferView | string;

export type ConnectionState = Record<string, unknown> | null;

export type ConnectionSetStateFn<T extends ConnectionState> = (
  prevState: T,
) => T;

export interface ConnectionContext {
  request: Request;
}

export interface Lobby {
  /** kebab-case party from the URL */
  party: string;
  /** Durable Object / binding class name */
  className: string;
  /** room id */
  name: string;
}

export interface PartyServerOptions {
  prefix?: string;
  cors?: boolean | HeadersInit;
  onBeforeConnect?: (
    req: Request,
    lobby: Lobby,
  ) => Response | Request | void | Promise<Response | Request | void>;
  onBeforeRequest?: (
    req: Request,
    lobby: Lobby,
  ) => Response | Request | void | Promise<Response | Request | void>;
}