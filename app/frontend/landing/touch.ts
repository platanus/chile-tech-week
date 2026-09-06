// Mobile flight controls: a joystick, bottom-left in game mode on a coarse (touch) pointer,
// that drives the exact same key state the keyboard does — window.condorScene.flock.keys — so
// updateCondor() and the flock's network reporting see no difference between a key press and a
// drag. `body.touch-ui` (toggled here from the same media query) is what the rest of the game
// UI keys off to go minimal: no map to teleport with a tap, no keyboard legend, a compact pilot
// corner (see landing.css and flock/hud.ts).
//
// Pulling the thumb out past the base's own visible circle engages sprint (the Shift boost);
// well past it, it steps the flight speed up once — the same step one scroll-wheel notch would,
// replayed as a synthetic wheel event on the scene's canvas so the two stay in perfect sync
// instead of duplicating scene.ts's speed formula here.
const coarse = matchMedia('(pointer: coarse)');

export function startTouchControls() {
  const applyClass = () => document.body.classList.toggle('touch-ui', coarse.matches);
  applyClass();
  coarse.addEventListener('change', applyClass);
  if (!coarse.matches) return; // nothing to wire for a mouse

  const baseEl = document.getElementById('joystick-base');
  const knobEl = document.getElementById('joystick-knob');
  if (!baseEl || !knobEl) return;
  const base = baseEl, knob = knobEl; // non-null for the closures below

  const R = 34; // px the knob travels before it pins to the base's edge (purely visual)
  const DEAD = R * 0.2;

  let pointerId: number | null = null;
  let originX = 0;
  let originY = 0;
  // the base's own on-screen radius: sprint needs the thumb truly outside the circle, not just
  // near its edge, so these come from the rendered element rather than a constant that could
  // drift from the CSS. Set on pointerdown, alongside the origin.
  let sprintAt = Infinity;
  let stepAt = Infinity;
  let stepArmed = true; // must ease back inside the sprint ring before another step can fire

  const keys = () => window.condorScene?.flock?.keys;

  function setKeys(dx: number, dy: number, dist: number) {
    const k = keys();
    if (!k) return;
    k.KeyA = dx < -DEAD;
    k.KeyD = dx > DEAD;
    k.KeyW = dy < -DEAD;
    k.KeyS = dy > DEAD;
    k.ShiftLeft = dist > sprintAt;
  }

  function clearKeys() {
    const k = keys();
    if (!k) return;
    k.KeyA = k.KeyD = k.KeyW = k.KeyS = k.ShiftLeft = false;
  }

  function bumpSpeed() {
    document.querySelector('canvas.scene')?.dispatchEvent(new WheelEvent('wheel', { deltaY: -1 }));
  }

  function move(e: PointerEvent) {
    if (e.pointerId !== pointerId) return;
    const dx = e.clientX - originX;
    const dy = e.clientY - originY;
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(dist, R);
    const angle = Math.atan2(dy, dx);
    knob.style.transform = dist > DEAD ? `translate(${Math.cos(angle) * clamped}px, ${Math.sin(angle) * clamped}px)` : '';
    setKeys(dx, dy, dist);
    base.classList.toggle('sprint', dist > sprintAt);
    base.classList.toggle('boost', dist > stepAt);
    if (dist > stepAt) {
      if (stepArmed) { stepArmed = false; bumpSpeed(); }
    } else if (dist <= sprintAt) {
      stepArmed = true;
    }
  }

  function end(e: PointerEvent) {
    if (e.pointerId !== pointerId) return;
    pointerId = null;
    stepArmed = true;
    clearKeys();
    knob.style.transform = '';
    base.classList.remove('sprint', 'boost');
  }

  base.addEventListener('pointerdown', (e) => {
    if (window.condorScene?.flock?.mode() !== 'game' || pointerId !== null) return;
    pointerId = e.pointerId;
    const r = base.getBoundingClientRect();
    originX = r.left + r.width / 2;
    originY = r.top + r.height / 2;
    const baseRadius = r.width / 2;
    sprintAt = baseRadius; // out of the circle entirely, not just near its edge
    stepAt = baseRadius * 1.6;
    base.setPointerCapture(e.pointerId);
    move(e);
  });
  base.addEventListener('pointermove', move);
  base.addEventListener('pointerup', end);
  base.addEventListener('pointercancel', end);
}
