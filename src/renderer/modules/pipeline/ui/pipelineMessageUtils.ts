/** Server-persisted board message ids are positive integers. */
export function isPersistedMessageId(id: number | null | undefined): id is number {
  return typeof id === 'number' && id > 0;
}

/** Insert mention token for user id into message body. */
export function formatMentionToken(userId: number): string {
  return `@[${userId}]`;
}

export type MentionSegment =
  | { type: 'text'; value: string }
  | { type: 'mention'; id: number; label: string; known: boolean };

/** Split message body into plain-text and @mention segments for rich rendering. */
export function splitMessageBody(
  body: string,
  mentions?: Array<{ user_id: number; user?: { name?: string | null } | null }>,
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
    const name = byName.get(id);
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
