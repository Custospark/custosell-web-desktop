import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

function scrollElementToTop(el: Element | null | undefined) {
  if (!el || !(el instanceof HTMLElement)) return;
  el.scrollTop = 0;
}

/**
 * On every route (path + search) change, reset window and marked scroll containers.
 * Covers app Main (`data-scroll-container`) and Discover main.
 */
export function ScrollToTop() {
  const { pathname, search } = useLocation();

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    document.querySelectorAll('[data-scroll-container]').forEach((node) => {
      scrollElementToTop(node);
    });
  }, [pathname, search]);

  return null;
}
