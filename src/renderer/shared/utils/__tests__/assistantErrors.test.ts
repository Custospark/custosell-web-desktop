import { describe, expect, it } from 'vitest';
import { assistantErrorMessage } from '../../api/assistant/AssistantQueries';

function backendError(message: string) {
  return {
    isAxiosError: true,
    response: { status: 500, data: { message } },
  };
}

describe('assistant error copy - server-worded, never a dead end', () => {
  it('rewrites backend Oscar copy to server wording', () => {
    expect(assistantErrorMessage(backendError('Could not reach Oscar. Check your connection and try again.'))).toBe(
      'Could not reach the server, please try again.',
    );
    expect(
      assistantErrorMessage(backendError('Oscar is busy right now (free-tier limit). Wait a moment and try again.')),
    ).toBe('The server is busy right now. Wait a moment and try again.');
    expect(assistantErrorMessage(backendError('Oscar had trouble answering. Try again in a moment.'))).toBe(
      'The server had trouble answering. Try again in a moment.',
    );
    expect(assistantErrorMessage(backendError('Oscar returned an empty answer. Try rephrasing.'))).toBe(
      'The server returned an empty answer. Try rephrasing.',
    );
  });

  it('keeps actionable backend copy without Oscar branding', () => {
    expect(
      assistantErrorMessage(backendError('The assistant key is invalid. Ask your administrator to check it.')),
    ).toBe('The assistant key is invalid. Ask your administrator to check it.');
  });
});
