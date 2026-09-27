import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { renderAssistantMessage } from '../../components/assistant/assistantMessageLinks';

function html(content: string): string {
  return renderToStaticMarkup(
    <MemoryRouter>{renderAssistantMessage(content)}</MemoryRouter>,
  );
}

describe('renderAssistantMessage', () => {
  it('leaves plain text untouched', () => {
    expect(html('How did sales do today?')).toBe('How did sales do today?');
  });

  it('linkifies a bare URL and keeps trailing punctuation outside', () => {
    const out = html('See https://staging.custosell.com/pipeline.');
    expect(out).toContain('<a href="https://staging.custosell.com/pipeline"');
    expect(out).toContain('target="_blank"');
    expect(out.endsWith('</a>.')).toBe(true);
  });

  it('renders markdown links with their label', () => {
    const out = html('Open [your pipeline](https://staging.custosell.com/pipeline) now.');
    expect(out).toContain('>your pipeline</a>');
    expect(out).toContain('href="https://staging.custosell.com/pipeline"');
  });

  it('does not link non-http schemes', () => {
    const out = html('Call mailto:info@custospark.com today');
    expect(out).not.toContain('<a');
  });

  it('navigates same-origin app routes internally without a new tab', () => {
    const out = html(`Confirm at ${window.location.origin}/pricing anytime.`);
    expect(out).toContain('href="/pricing"');
    expect(out).not.toContain('target="_blank"');
  });

  it('opens unknown same-origin paths externally', () => {
    const out = html(`See ${window.location.origin}/no-such-route-xyz.`);
    expect(out).toContain('target="_blank"');
  });
});
