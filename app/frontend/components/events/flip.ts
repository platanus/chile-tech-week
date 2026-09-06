import { useEffect, useLayoutEffect, useRef } from 'react';

// FLIP for the programme list: when a filter changes, the rows that stay slide from where
// they were to where they now are instead of jumping, the ones that arrive fade in, and the
// ones that leave fade out where they stood.
//
// The name is the technique — First, Last, Invert, Play. React has already re-rendered by
// the time the layout effect runs (that is Last), so each row is offset back to where it was
// (Invert) and then released, which the browser animates.
//
// Rows are the container's children, each tagged `data-flip-key`. After every pass the hook
// keeps their positions *and* a clone of each row, because a row that leaves is gone from
// the DOM by the time we notice — the clone is what fades out in its place.

export const MOVE_MS = 260;
export const FADE_MS = 180;
const EASE = 'cubic-bezier(.2,.7,.3,1)';

type Snapshot = {
  rects: Map<string, DOMRect>;
  clones: Map<string, HTMLElement>;
};

// useLayoutEffect warns when React renders on the server (SSR is on for every page).
const useBrowserLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

function rowsOf(container: HTMLElement) {
  return Array.from(container.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement && !!child.dataset.flipKey,
  );
}

function snapshot(container: HTMLElement): Snapshot {
  const rects = new Map<string, DOMRect>();
  const clones = new Map<string, HTMLElement>();

  for (const row of rowsOf(container)) {
    const key = row.dataset.flipKey as string;
    rects.set(key, row.getBoundingClientRect());
    clones.set(key, row.cloneNode(true) as HTMLElement);
  }
  return { rects, clones };
}

function fadeOutGhost(container: HTMLElement, ghost: HTMLElement, from: DOMRect) {
  // A ghost is a picture of a row, not a row: nothing may find it. Its key, its ids and its
  // test handles go, it is out of the accessibility tree and out of the tab order — otherwise
  // a list of two would read as a list of sixteen for the fifth of a second it fades.
  ghost.setAttribute('aria-hidden', 'true');
  ghost.setAttribute('inert', '');
  for (const element of [ghost, ...ghost.querySelectorAll('[id], [data-testid], [data-flip-key]')]) {
    element.removeAttribute('id');
    element.removeAttribute('data-testid');
    element.removeAttribute('data-flip-key');
  }
  Object.assign(ghost.style, {
    position: 'absolute',
    top: `${from.top - container.getBoundingClientRect().top}px`,
    left: '0',
    width: `${from.width}px`,
    pointerEvents: 'none',
  });
  container.appendChild(ghost);

  const done = () => ghost.remove();
  ghost.animate([{ opacity: 1 }, { opacity: 0 }], { duration: FADE_MS, easing: 'ease-out', fill: 'forwards' })
    .finished.then(done, done);
}

/**
 * Animates the container's rows between renders. `signature` is what changed — pass
 * something that differs whenever the list does, such as the keys joined together.
 */
export function useFlipList(container: React.RefObject<HTMLElement | null>, signature: string) {
  const previous = useRef<Snapshot | null>(null);

  useBrowserLayoutEffect(() => {
    const element = container.current;
    if (!element) return;

    const before = previous.current;
    previous.current = snapshot(element);

    // The first pass has nothing to animate from, and a visitor who asked for less motion
    // gets none: the list simply changes.
    if (!before || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const present = new Set<string>();

    for (const row of rowsOf(element)) {
      const key = row.dataset.flipKey as string;
      present.add(key);
      const from = before.rects.get(key);

      if (!from) {
        row.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], {
          duration: MOVE_MS,
          easing: EASE,
        });
        continue;
      }

      const dy = from.top - (previous.current.rects.get(key)?.top ?? from.top);
      if (Math.abs(dy) < 1) continue;

      row.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: MOVE_MS, easing: EASE });
    }

    for (const [key, rect] of before.rects) {
      if (present.has(key)) continue;

      const ghost = before.clones.get(key);
      if (ghost) fadeOutGhost(element, ghost, rect);
    }
  }, [container, signature]);
}
