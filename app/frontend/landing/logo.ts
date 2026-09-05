// The logo: every line is spaced to the widest one (textLength), the viewBox hugs the block,
// and the draw animation only starts once Unbounded is in, so the strokes trace the real glyphs.
// Verbatim from the inline <script> of the original index.html; it installs window.logoDone,
// which scene.ts awaits before its first frame.
declare global {
  interface Window {
    logoDone?: Promise<unknown>;
    condorScene?: unknown;
  }
}

export function startLogo() {
(() => {
  const svg = document.getElementById('logo') as SVGSVGElement | null;
  if (!svg) return;
  const texts = Array.from(svg.querySelectorAll('text'));
  const fit = () => {
    const w = Math.max(...texts.filter((t) => t.parentNode === svg).map((t) => t.getComputedTextLength()));
    if (!w) return;
    texts.forEach((t) => { t.setAttribute('textLength', String(w)); t.setAttribute('lengthAdjust', 'spacing'); });
    svg.setAttribute('viewBox', `0 0 ${w} 370`);
  };
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // the scene waits for this before it starts rendering, so the two animations do not compete
  // for the main thread during the strokes; it resolves SCENE_LEAD_MS after the logo starts, so
  // with its build and 0.9 s fade the scene finishes appearing while the last lines land.
  // At once without motion, and after 6 s no matter what.
  const SCENE_LEAD_MS = 1000;
  let logoResolve!: (value?: unknown) => void;
  window.logoDone = new Promise((r) => { logoResolve = r; setTimeout(r, 6000); });
  const play = () => { svg.classList.remove('go'); void svg.getBoundingClientRect(); svg.classList.add('go'); setTimeout(logoResolve, SCENE_LEAD_MS); };
  const start = () => { fit(); if (still) { svg.classList.add('still'); logoResolve(); } else play(); };
  (document.fonts ? document.fonts.load('800 100px Unbounded').then(() => document.fonts.ready) : Promise.resolve()).then(start, start);
  if (!still) svg.addEventListener('click', play);
})();
}
