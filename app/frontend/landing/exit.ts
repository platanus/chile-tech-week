// Leaving the landing.
//
// The scene owns the document: its <canvas> hangs off <body>, and its frame loop
// (scene.ts) re-arms requestAnimationFrame forever with no way to stop it. An Inertia
// visit only swaps the page component, so the canvas would survive the swap and sit
// frozen over the next page. So the landing hands over with a real navigation instead,
// behind the fade the scene already uses for crashes and teleports: black in, then the
// browser tears the whole document down and the next page arrives fresh (site.css fades
// it in). Every link out of the landing carries `data-exit`.
const FADE_MS = 420;

let leaving = false;

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function leave(href: string) {
  if (leaving) return;
  leaving = true;

  const fade = document.getElementById('fade');
  if (!fade || prefersReducedMotion()) {
    window.location.assign(href);
    return;
  }

  // Inline, like scene.ts's own crash fade: it writes this same property, and a stylesheet
  // rule would lose to whatever it left behind.
  fade.style.transition = `opacity ${FADE_MS}ms ease`;
  fade.style.opacity = '1';
  window.setTimeout(() => window.location.assign(href), FADE_MS);
}

// A modified click is the visitor asking for a new tab or a download — leave it alone.
function opensElsewhere(event: MouseEvent) {
  return event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

export function startExit() {
  document.addEventListener('click', (event) => {
    const link = (event.target as Element | null)?.closest?.('a[data-exit]') as HTMLAnchorElement | null;
    if (!link || opensElsewhere(event)) return;

    event.preventDefault();
    leave(link.href);
  });

  // Coming back with the back button restores this document from the bfcache mid-fade,
  // which would otherwise show a black page.
  window.addEventListener('pageshow', (event) => {
    if (!event.persisted) return;

    leaving = false;
    const fade = document.getElementById('fade');
    if (fade) fade.style.opacity = '0';
  });
}
