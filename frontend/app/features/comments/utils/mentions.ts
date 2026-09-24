/**
 * Shared mention-token helpers for comments.
 *
 * A mention is stored/sent as `@[Display Name](user-id)` — inserted by
 * CommentForm.tsx's autocomplete dropdown, parsed by the backend's
 * MentionParser (backend/app/core/comments/service.py) which resolves the
 * user directly by ID. Resolving by ID (not by scanning `@word` against
 * email) is deliberate: a plain `@(\w+)` regex can't distinguish a name with
 * a space, and an email like `@owner@aiutox.com` gets truncated at the
 * second `@` by any `\w+`-based pattern — both silently broke mention
 * notifications before this format existed.
 */

const MENTION_TOKEN_PATTERN = /@\[([^\]]+)\]\([0-9a-fA-F-]{36}\)/g;

/** Builds the token to insert when a user picks a mention candidate. */
export function buildMentionToken(name: string, userId: string): string {
  return `@[${name}](${userId})`;
}

/** Replaces every mention token with a plain "@Name" for display. */
export function renderMentionText(content: string): string {
  return content.replace(MENTION_TOKEN_PATTERN, (_match, name: string) => `@${name}`);
}

interface ContentSegment {
  type: "text" | "mention";
  value: string;
}

/** Splits comment content into plain-text and mention segments, for
 * rendering each mention as a distinctly-styled inline element rather than
 * flattening to a plain string. */
export function splitMentionSegments(content: string): ContentSegment[] {
  const segments: ContentSegment[] = [];
  let lastIndex = 0;

  for (const match of content.matchAll(MENTION_TOKEN_PATTERN)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      segments.push({ type: "text", value: content.slice(lastIndex, index) });
    }
    segments.push({ type: "mention", value: `@${match[1]}` });
    lastIndex = index + match[0].length;
  }

  if (lastIndex < content.length) {
    segments.push({ type: "text", value: content.slice(lastIndex) });
  }

  return segments;
}

export interface SelectedMention {
  name: string;
  userId: string;
}

/** Resolves plain "@Name" occurrences in composed text back into real
 * "@[Name](id)" tokens, using only the mentions actually selected from the
 * autocomplete dropdown during this compose session — not a general-purpose
 * text diff. This is deliberately simple: if the user edits a name after
 * selecting it, that occurrence just stops matching and is sent as plain
 * text (loses the mention) rather than risking corrupted output. Longer
 * names are resolved first so one name that is a prefix of another (e.g.
 * "Ana" vs "Ana Maria") doesn't get partially replaced.
 */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function resolveMentionsForSubmit(
  displayedText: string,
  selectedMentions: SelectedMention[]
): string {
  const byLongestNameFirst = [...selectedMentions].sort(
    (a, b) => b.name.length - a.name.length
  );

  let result = displayedText;
  for (const { name, userId } of byLongestNameFirst) {
    // Match "@Name" only when not immediately followed by another word
    // character — so an edited "@System Owners" no longer matches the
    // selected "System Owner" (word-boundary check via negative lookahead,
    // since \b alone doesn't fire at the end of a name ending mid-word).
    const pattern = new RegExp(`@${escapeRegExp(name)}(?!\\w)`, "g");
    result = result.replace(pattern, buildMentionToken(name, userId));
  }
  return result;
}
