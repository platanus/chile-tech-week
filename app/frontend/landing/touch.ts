// Mobile flight controls: a joystick, bottom centre in game mode on a coarse (touch) pointer,
// that drives the exact same key state the keyboard does — window.condorScene.flock.keys — so
// updateCondor() and the flock's network reporting see no difference between a key press and a
// drag. `body.touch-ui` (toggled here from the same media query) is what the rest of the game
// UI keys off to go minimal: no map to teleport with a tap, no keyboard legend, a compact pilot
// corner (see landing.css and flock/hud.ts).
//
// Left of it, under the other thumb, a spring-loaded throttle lever. Pushing it up feeds
// window.condorScene.setThrottle() the same acceleration Shift gives a keyboard pilot, in
// proportion to how far it is pushed; lifting the thumb eases it straight back down to cruise.
// That boost is the whole speed control on touch: the base glide speed (the scroll wheel's job
// on a desktop) stays where the scene set it, so a thumb can never leave it somewhere it can't
// be brought back from.

/**
 * Lever position — 0 resting at the bottom, 1 pushed to the top — for a thumb at viewport `y`,
 * on a track `height` tall whose top edge is at `top` and whose knob is `knob` tall. The knob's
 * centre follows the thumb, so the ends are half a knob inside the track; past either one the
 * lever pins there.
 */
export function throttleAt(y: number, top: number, height: number, knob: number): number {
  const travel = height - knob;
  if (travel <= 0) return 0;
  const idle = top + height - knob / 2; // where the knob's centre sits with the lever down
  return Math.min(1, Math.max(0, (idle - y) / travel));
}

const keys = () => window.condorScene?.flock?.keys;
const flying = () => window.condorScene?.flock?.mode() === 'game';

export function startTouchControls() {
  // Read inside the call, not at import: this module is bundled into the SSR build too, where
  // there is no matchMedia to ask.
  const coarse = matchMedia('(pointer: coarse)');
  const applyClass = () => document.body.classList.toggle('touch-ui', coarse.matches);
  applyClass();
  coarse.addEventListener('change', applyClass);
  if (!coarse.matches) return; // nothing to wire for a mouse

  wireJoystick();
  wireThrottle();
}

/** Steering: a relative drag from the base's centre, held as the four flight keys. */
function wireJoystick() {
  const baseEl = document.getElementById('joystick-base');
  const knobEl = document.getElementById('joystick-knob');
  if (!baseEl || !knobEl) return;
  const base = baseEl, knob = knobEl; // non-null for the closures below

  const R = 34; // px the knob travels before it pins to the base's edge (purely visual)
  const DEAD = R * 0.2;

  let pointerId: number | null = null;
  let originX = 0;
  let originY = 0;

  function setKeys(dx: number, dy: number) {
    const k = keys();
    if (!k) return;
    k.KeyA = dx < -DEAD;
    k.KeyD = dx > DEAD;
    k.KeyW = dy < -DEAD;
    k.KeyS = dy > DEAD;
  }

  function clearKeys() {
    const k = keys();
    if (!k) return;
    k.KeyA = k.KeyD = k.KeyW = k.KeyS = false;
  }

  function move(e: PointerEvent) {
    if (e.pointerId !== pointerId) return;
    const dx = e.clientX - originX;
    const dy = e.clientY - originY;
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(dist, R);
    const angle = Math.atan2(dy, dx);
    knob.style.transform = dist > DEAD ? `translate(${Math.cos(angle) * clamped}px, ${Math.sin(angle) * clamped}px)` : '';
    setKeys(dx, dy);
  }

  function end(e: PointerEvent) {
    if (e.pointerId !== pointerId) return;
    pointerId = null;
    clearKeys();
    knob.style.transform = '';
  }

  base.addEventListener('pointerdown', (e) => {
    if (!flying() || pointerId !== null) return;
    pointerId = e.pointerId;
    const r = base.getBoundingClientRect();
    originX = r.left + r.width / 2;
    originY = r.top + r.height / 2;
    base.setPointerCapture(e.pointerId);
    move(e);
  });
  base.addEventListener('pointermove', move);
  base.addEventListener('pointerup', end);
  base.addEventListener('pointercancel', end);
}

/** The throttle lever: the knob follows the thumb up the track, and springs back on release. */
function wireThrottle() {
  const lever = document.getElementById('throttle');
  const trackEl = lever?.querySelector<HTMLElement>('.track');
  const knobEl = lever?.querySelector<HTMLElement>('.knob');
  if (!lever || !trackEl || !knobEl) return;
  const el = lever, track = trackEl, knob = knobEl; // non-null for the closures below

  const SPRING_MS = 180; // the glide back down to cruise once the thumb lifts

  let pointerId: number | null = null;
  let value = 0;
  let spring = 0; // rAF handle for that glide

  // One number drives the lot: the scene's boost, the knob's travel, and — as `--t` on the
  // element — how far the red fill has risen and how hot the knob and its label look.
  function apply(v: number) {
    value = v;
    el.style.setProperty('--t', v.toFixed(3));
    knob.style.transform = `translateY(${-v * (track.clientHeight - knob.offsetHeight)}px)`;
    window.condorScene?.setThrottle?.(v);
  }

  function follow(e: PointerEvent) {
    if (e.pointerId !== pointerId) return;
    const r = track.getBoundingClientRect();
    apply(throttleAt(e.clientY, r.top + track.clientTop, track.clientHeight, knob.offsetHeight));
  }

  function end(e: PointerEvent) {
    if (e.pointerId !== pointerId) return;
    pointerId = null;
    const from = value, t0 = performance.now();
    const step = () => {
      const k = Math.min(1, (performance.now() - t0) / SPRING_MS);
      apply(from * (1 - k) ** 2); // leaves the top at once, settles softly at the bottom
      if (k < 1) spring = requestAnimationFrame(step);
    };
    spring = requestAnimationFrame(step);
  }

  el.addEventListener('pointerdown', (e) => {
    if (!flying() || pointerId !== null) return;
    pointerId = e.pointerId;
    cancelAnimationFrame(spring);
    el.setPointerCapture(e.pointerId);
    follow(e);
  });
  el.addEventListener('pointermove', follow);
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
}
