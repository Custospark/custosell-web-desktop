import type { ReactNode } from 'react';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { AssistantInternalLink } from './AssistantInternalLink';

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
  const to = sameAppRoute(href);
  if (to !== null) {
    // In-app route - client-side navigation with the panel stepping aside
    // so the destination page is fully visible, no new tab.
    return (
      <AssistantInternalLink
        key={key}
        to={to}
        className="font-medium text-blue-700 underline hover:text-blue-900 [overflow-wrap:anywhere]"
      >
        {label}
      </AssistantInternalLink>
    );
  }
  return (
    <a
      key={key}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-blue-700 underline hover:text-blue-900 [overflow-wrap:anywhere]"
    >
      {label}
    </a>
  );
}

/** Flatten the ROUTES registry to literal paths (functions skipped). */
function collectRoutePaths(node: unknown, out: string[]): void {
  if (typeof node === 'string') {
    if (node.startsWith('/')) out.push(node);
    return;
  }
  if (typeof node === 'object' && node !== null) {
    for (const value of Object.values(node)) {
      collectRoutePaths(value, out);
    }
  }
}

let routePatterns: RegExp[] | null = null;

function internalRoutePatterns(): RegExp[] {
  if (!routePatterns) {
    const paths: string[] = [];
    collectRoutePaths(ROUTES, paths);
    routePatterns = paths.map(
      (path) =>
        new RegExp(
          '^' +
            path
              .split('/')
              .map((segment) =>
                segment.startsWith(':')
                  ? '[^/]+'
                  : segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
              )
              .join('/') +
            '/?$',
        ),
    );
  }
  return routePatterns;
}

/**
 * Same-origin URL matching a real app route - returned as the router
 * target for internal navigation. Anything else (foreign origin, unknown
 * path, no window) stays null so the caller opens it externally.
 */
function sameAppRoute(href: string): string | null {
  try {
    if (typeof window === 'undefined') return null;
    const url = new URL(href);
    if (normalizeOrigin(url.origin) !== normalizeOrigin(window.location.origin)) return null;
    if (!internalRoutePatterns().some((pattern) => pattern.test(url.pathname))) {
      return null;
    }
    return url.pathname + url.search + url.hash;
  } catch {
    return null;
  }
}

/**
 * Origin equivalence ignoring a leading www - custosell.com and
 * www.custosell.com serve the same app, so agent links stay in-app no
 * matter which host rendered the page.
 */
export function normalizeOrigin(origin: string): string {
  return origin.toLowerCase().replace(/^([a-z][a-z0-9+.-]*:\/\/)www\./, '$1');
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
