/** Server-persisted board message ids are positive integers. */
export function isPersistedMessageId(id: number | null | undefined): id is number {
  return typeof id === 'number' && id > 0;
}

/** Insert mention token for user id into message body. */
export function formatMentionToken(userId: number): string {
  return `@[${userId}]`;
}

/**
 * Convert a display draft where mentions are readable "@Name" back into
 * backend "@[userId]" tokens. Picks the message body plus the resolved
 * mention name map keyed by user id (used to optimistically render names).
 */
export function toMentionTokenBody(
  body: string,
  memberNames: Map<number, string>,
): { body: string; mentionNames: Record<string, string> } {
  const nameToId = new Map<string, number>();
  for (const [id, name] of memberNames) {
    if (name) nameToId.set(name, id);
  }
  const sortedNames = Array.from(nameToId.keys()).sort((a, b) => b.length - a.length);

  let next = body;
  const mentionNames: Record<string, string> = {};
  for (const name of sortedNames) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const id = nameToId.get(name) as number;
    let match: RegExpExecArray | null;
    const regex = new RegExp(`(@${escaped})(?!\\w)`, 'g');
    while ((match = regex.exec(next)) !== null) {
      const token = formatMentionToken(id);
      mentionNames[String(id)] = name;
      next = next.slice(0, match.index) + token + next.slice(match.index + match[1].length);
      regex.lastIndex = 0;
    }
  }
  return { body: next, mentionNames };
}

export type MentionSegment =
  | { type: 'text'; value: string }
  | { type: 'mention'; id: number; label: string; known: boolean };

/** Split message body into plain-text and @mention segments for rich rendering. */
export function splitMessageBody(
  body: string,
  mentions?: Array<{ user_id: number; user?: { name?: string | null } | null }>,
  memberNames?: Map<number, string>,
): MentionSegment[] {
  const byName = new Map<number, string>();
  for (const mention of mentions ?? []) {
    if (mention.user?.name) byName.set(mention.user_id, mention.user.name);
  }

  const segments: MentionSegment[] = [];
  const regex = /@\[(\d+)\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(body)) !== null) {
    const id = Number(match[1]);
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: body.slice(lastIndex, match.index) });
    }
    const name = byName.get(id) ?? memberNames?.get(id);
    segments.push({
      type: 'mention',
      id,
      label: name || `Member #${id}`,
      known: Boolean(name),
    });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < body.length) {
    segments.push({ type: 'text', value: body.slice(lastIndex) });
  }
  return segments;
}

export const CONVERSATION_EMOJI_OPTIONS = ['👍', '❤️', '😂', '🎉', '🔥', '👀', '✅', '🙏', '💡', '🚀'] as const;
