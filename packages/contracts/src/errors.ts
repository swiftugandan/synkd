export const SynkdErrorCode = {
  ROUTE_NOT_FOUND: "ROUTE_NOT_FOUND",
  PARTY_NOT_FOUND: "PARTY_NOT_FOUND",
  LOBBY_REJECTED: "LOBBY_REJECTED",
  ROOM_OVERLOADED: "ROOM_OVERLOADED",
  INVALID_TAG: "INVALID_TAG",
  UNAUTHORIZED: "UNAUTHORIZED",
  INTERNAL: "INTERNAL",
} as const;

export type SynkdErrorCode =
  (typeof SynkdErrorCode)[keyof typeof SynkdErrorCode];

export class SynkdError extends Error {
  readonly code: SynkdErrorCode;
  readonly status: number;

  constructor(code: SynkdErrorCode, message: string, status = 400) {
    super(message);
    this.name = "SynkdError";
    this.code = code;
    this.status = status;
  }
}