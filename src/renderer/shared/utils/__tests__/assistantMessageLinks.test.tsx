import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { renderAssistantMessage } from '../../components/assistant/assistantMessageLinks';

function html(content: string): string {
  return renderToStaticMarkup(<>{renderAssistantMessage(content)}</>);
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
});
