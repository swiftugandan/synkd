export const SinkdErrorCode = {
  ROUTE_NOT_FOUND: "ROUTE_NOT_FOUND",
  PARTY_NOT_FOUND: "PARTY_NOT_FOUND",
  LOBBY_REJECTED: "LOBBY_REJECTED",
  ROOM_OVERLOADED: "ROOM_OVERLOADED",
  INVALID_TAG: "INVALID_TAG",
  UNAUTHORIZED: "UNAUTHORIZED",
  INTERNAL: "INTERNAL",
} as const;

export type SinkdErrorCode =
  (typeof SinkdErrorCode)[keyof typeof SinkdErrorCode];

export class SinkdError extends Error {
  readonly code: SinkdErrorCode;
  readonly status: number;

  constructor(code: SinkdErrorCode, message: string, status = 400) {
    super(message);
    this.name = "SinkdError";
    this.code = code;
    this.status = status;
  }
}