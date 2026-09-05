// The pure part of showing other condors: where a remote pose sits in this client's copy of the
// strip, where it has flown since it was sent, and how the shown bird eases onto it. No DOM, no
// three.js, so it runs under Vitest.

export interface Pose {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  roll: number;
  speed: number;
}

/** The scene's flight model: a bank of `bank` radians yaws at `turnRate` rad/s (scene.ts updateCondor). */
export interface Physics {
  turnRate: number;
  bank: number;
}

/** Position along the real relief for any raw z: the strip mirrors every length L. */
export const fold = (z: number, L: number) => {
  const t = (((z / L) % 2) + 2) % 2;
  return (t <= 1 ? t : 2 - t) * L;
};

/** The copy of `z` nearest to `zLocal`: either a straight copy (2Ln + z) or a mirrored one
 *  (2Ln − z), where the relief runs the other way. */
export function nearestCopy(z: number, zLocal: number, L: number): { z: number; mirrored: boolean } {
  const same = 2 * L * Math.round((zLocal - z) / (2 * L)) + z;
  const mirror = 2 * L * Math.round((zLocal + z) / (2 * L)) - z;
  return Math.abs(same - zLocal) <= Math.abs(mirror - zLocal)
    ? { z: same, mirrored: false }
    : { z: mirror, mirrored: true };
}

/** A remote pose expressed in the local copy. In a mirrored copy the bird flies the other way
 *  along z (yaw → π − yaw) and banks the other way (roll → −roll). */
export function localize(p: Pose, zLocal: number, L: number): Pose {
  const { z, mirrored } = nearestCopy(p.z, zLocal, L);
  if (!mirrored) return z === p.z ? p : { ...p, z };
  return { ...p, z, yaw: Math.PI - p.yaw, roll: -p.roll };
}

/** Dead reckoning with the scene's own flight model: constant speed along the heading, the
 *  heading turning with the bank. Straight flight is reproduced exactly; turns bend the path. */
export function advance(p: Pose, dt: number, ph: Physics): Pose {
  if (dt <= 0) return p;
  const yaw = p.yaw + (p.roll / Math.max(ph.bank, 0.01)) * ph.turnRate * dt;
  const ym = (p.yaw + yaw) / 2;
  const cp = Math.cos(p.pitch);
  return {
    ...p,
    yaw,
    x: p.x - Math.sin(ym) * cp * p.speed * dt,
    y: p.y + Math.sin(p.pitch) * p.speed * dt,
    z: p.z - Math.cos(ym) * cp * p.speed * dt,
  };
}

export const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/** Where a target is from the viewer, in the viewer's copy of the strip: the distance over the
 *  ground, the climb to it (positive when it flies higher), the bearing from the viewer's heading
 *  (radians, positive to the right) and the straight-line distance, all in world units. */
export interface Relation {
  ground: number;
  climb: number;
  bearing: number;
  distance: number;
}

export function relate(
  viewer: { x: number; y: number; z: number; yaw: number },
  target: { x: number; y: number; z: number },
  L: number,
): Relation {
  const z = nearestCopy(target.z, viewer.z, L).z;
  const dx = target.x - viewer.x;
  const dz = z - viewer.z;
  const climb = target.y - viewer.y;
  const ground = Math.hypot(dx, dz);
  // the yaw that would point at the target, on the scene's convention (heading 0 flies toward −z)
  const yawTo = Math.atan2(-dx, -dz);
  return { ground, climb, bearing: ground < 1e-6 ? 0 : wrapAngle(viewer.yaw - yawTo), distance: Math.hypot(ground, climb) };
}

/** Ease the shown pose toward the target by `k` (0..1); a jump longer than `snap` is taken at
 *  once (a respawn, a copy switch) rather than flown across the map. */
export function blend(shown: Pose, target: Pose, k: number, snap = 80): Pose {
  if (Math.hypot(target.x - shown.x, target.y - shown.y, target.z - shown.z) > snap) return target;
  const lerp = (a: number, b: number) => a + (b - a) * k;
  const alerp = (a: number, b: number) => a + wrapAngle(b - a) * k;
  return {
    x: lerp(shown.x, target.x),
    y: lerp(shown.y, target.y),
    z: lerp(shown.z, target.z),
    yaw: alerp(shown.yaw, target.yaw),
    pitch: alerp(shown.pitch, target.pitch),
    roll: alerp(shown.roll, target.roll),
    speed: lerp(shown.speed, target.speed),
  };
}

/** The sender's pacing: an input change goes out almost at once, ordinary flight at the base
 *  rate, and an unchanged pose still pings at the heartbeat so the server keeps the pilot. */
export const SEND = { urgentMs: 40, baseMs: 100, heartbeatMs: 1000, spectatorMs: 1000 };

export function shouldSend(
  now: number,
  lastSentAt: number,
  { changed, urgent, spectator }: { changed: boolean; urgent: boolean; spectator: boolean },
): boolean {
  const since = now - lastSentAt;
  if (spectator) return since >= SEND.spectatorMs;
  if (urgent && since >= SEND.urgentMs) return true;
  if (changed && since >= SEND.baseMs) return true;
  return since >= SEND.heartbeatMs;
}
