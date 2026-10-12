/** PartyKit / PartyServer: max tags per connection. */
export const MAX_CONNECTION_TAGS = 9;

/** PartyKit / PartyServer: max characters per tag. */
export const MAX_TAG_LENGTH = 256;

/** Default URL prefix for party routes. */
export const DEFAULT_PARTY_PREFIX = "parties";

/** Default party name when client omits `party`. */
export const DEFAULT_PARTY_NAME = "main";

/** Query param carrying the connection id (PartySocket convention). */
export const CONNECTION_ID_QUERY = "_pk";

/** Optional JSON props header used by PartyServer routers. */
export const PROPS_HEADER = "x-partykit-props";

/**
 * WebSocket close: service restart / ownership move.
 * partysocket reconnects; sinkd uses this on hot-reload and process drain.
 * @see https://www.rfc-editor.org/rfc/rfc6455#section-7.4.1
 */
export const WS_CLOSE_SERVICE_RESTART = 1012;