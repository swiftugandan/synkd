import { SynkdError, SynkdErrorCode } from "./errors.js";
import { MAX_CONNECTION_TAGS, MAX_TAG_LENGTH } from "./limits.js";
import { asTag, type ConnectionId, type Tag } from "./types.js";

/**
 * Ensure tags obey PartyKit limits and always lead with the connection id.
 */
export function normalizeTags(
  connectionId: ConnectionId | string,
  tags: readonly string[] = [],
): Tag[] {
  const cleaned = tags
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && t !== connectionId);

  const withId = [String(connectionId), ...cleaned];
  const unique = [...new Set(withId)];
  assertTags(unique);
  return unique.map(asTag);
}

export function assertTags(tags: readonly string[]): void {
  if (tags.length > MAX_CONNECTION_TAGS) {
    throw new SynkdError(
      SynkdErrorCode.INVALID_TAG,
      `At most ${MAX_CONNECTION_TAGS} tags allowed (got ${tags.length})`,
    );
  }
  for (const tag of tags) {
    if (tag.length > MAX_TAG_LENGTH) {
      throw new SynkdError(
        SynkdErrorCode.INVALID_TAG,
        `Tag exceeds ${MAX_TAG_LENGTH} characters`,
      );
    }
  }
}