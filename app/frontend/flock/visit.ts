// Flying to another condor's side. The landing is read when the screen is black, from wherever
// the target is by then, and set off to their rear quarter, at their altitude, on their heading,
// so the two birds never share a point and the visitor sees them ahead. A target only known
// from the roster (no heading) is approached facing it, from the south. Pure, for the tests.
import { localize, type Pose } from './math';

/** World units: behind the target along its heading, and to its side. The chase camera sits 22
 *  units behind the bird, so the visited condor shows ahead and off to one side, a few wingspans
 *  away (a bird is ~3 units across at condorScale 1). */
export const OFFSET = { behind: 12, side: 6 };

export interface Target {
  x: number;
  y: number;
  z: number;
  yaw: number | null;
}

/** Where to land beside `target`, in the viewer's copy of the strip. `precise` is false for a
 *  roster sighting: coarse, seconds old, no heading — the scene keeps the screen black a little
 *  longer for a better one. */
export function landingBeside(target: Target, zLocal: number, L: number): { x: number; y: number; z: number; yaw: number; precise: boolean } {
  const pose: Pose = { x: target.x, y: target.y, z: target.z, yaw: target.yaw ?? 0, pitch: 0, roll: 0, speed: 0 };
  const local = localize(pose, zLocal, L);
  // a roster sighting has no heading: come in from the south, facing north, so the target sits ahead
  const yaw = target.yaw === null ? 0 : local.yaw;
  const fx = -Math.sin(yaw);
  const fz = -Math.cos(yaw); // forward, as scene.ts flies it
  const rx = -fz;
  const rz = fx; // the bird's right
  return {
    x: local.x - fx * OFFSET.behind + rx * OFFSET.side,
    y: local.y,
    z: local.z - fz * OFFSET.behind + rz * OFFSET.side,
    yaw,
    precise: target.yaw !== null,
  };
}
