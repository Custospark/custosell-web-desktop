import type { ReactNode } from 'react';

/**
 * Renders assistant message text with clickable links.
 * Supports markdown [label](https://...) and bare https:// URLs.
 * Only http(s) targets, always opened in a new tab - never raw HTML.
 */
const TOKEN_PATTERN = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<>()]+)/g;

/** Trailing punctuation is sentence dressing, not part of the address. */
function splitTrailingPunctuation(url: string): { url: string; trail: string } {
  const match = url.match(/^(.*?)([.,;:!?)\]}]+)$/);
  if (!match) return { url, trail: '' };
  // Keep short TLD-safe core - a bare "https://x." keeps its dot out.
  if (match[1].length < 9) return { url, trail: '' };
  return { url: match[1], trail: match[2] };
}

function linkNode(href: string, label: string, key: string): ReactNode {
  return (
    <a
      key={key}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-blue-700 underline hover:text-blue-900"
    >
      {label}
    </a>
  );
}

export function renderAssistantMessage(content: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  TOKEN_PATTERN.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = TOKEN_PATTERN.exec(content)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(content.slice(lastIndex, match.index));
    }
    if (match[2]) {
      // Markdown [label](url).
      nodes.push(linkNode(match[2], match[1], `link-${key++}`));
    } else {
      const { url, trail } = splitTrailingPunctuation(match[3]);
      nodes.push(linkNode(url, url, `link-${key++}`));
      if (trail) nodes.push(trail);
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    nodes.push(content.slice(lastIndex));
  }
  if (nodes.length === 0) {
    nodes.push(content);
  }
  return nodes;
}
