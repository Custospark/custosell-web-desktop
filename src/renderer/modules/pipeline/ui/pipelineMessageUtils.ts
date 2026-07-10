/** Server-persisted board message ids are positive integers. */
export function isPersistedMessageId(id: number | null | undefined): id is number {
  return typeof id === 'number' && id > 0;
}

/** Insert mention token for user id into message body. */
export function formatMentionToken(userId: number, _name: string): string {
  return `@[${userId}]`;
}

/** Render body with @mentions highlighted for display. */
export function renderMessageBody(
  body: string,
  mentions?: Array<{ user_id: number; user?: { name?: string | null } | null }>,
): string {
  let rendered = body;
  for (const mention of mentions ?? []) {
    const token = `@[${mention.user_id}]`;
    const label = mention.user?.name ? `@${mention.user.name}` : token;
    rendered = rendered.replaceAll(token, label);
  }
  return rendered;
}

export const CONVERSATION_EMOJI_OPTIONS = ['👍', '❤️', '😂', '🎉', '🔥', '👀', '✅', '🙏', '💡', '🚀'] as const;
