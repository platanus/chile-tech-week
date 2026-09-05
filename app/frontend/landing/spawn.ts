// Where a flight starts. The tuned start (P.startKm / startLat / startHeading) frames the Gran
// Torre with El Plomo behind it; every pilot spawns near it, scattered so freshly arrived
// condors are in sight of each other without sitting on top of one another. The heading is
// re-aimed from the scattered point at what the tuned start looks at, so each spawn keeps that
// view of the city.

export interface Spawn {
  x: number;
  y: number;
  z: number;
  yaw: number;
}

export interface Scatter {
  /** Half-widths of the scatter, world units: across the heading, along it, and in altitude. */
  side: number;
  along: number;
  altitude: number;
  /** How far ahead of the tuned start its landmark sits, km: the point every spawn aims at. */
  aimKm: number;
  upk: number;
}

export function scatterSpawn(base: Spawn, s: Scatter, rng: () => number = Math.random): Spawn {
  const fx = -Math.sin(base.yaw);
  const fz = -Math.cos(base.yaw); // forward, as scene.ts flies it (heading 0 is toward -z)
  const rx = -fz;
  const rz = fx; // the bird's right
  const aimX = base.x + fx * s.aimKm * s.upk;
  const aimZ = base.z + fz * s.aimKm * s.upk;
  const side = (rng() * 2 - 1) * s.side;
  const along = (rng() * 2 - 1) * s.along;
  const dy = (rng() * 2 - 1) * s.altitude;
  const x = base.x + rx * side + fx * along;
  const z = base.z + rz * side + fz * along;
  return { x, y: base.y + dy, z, yaw: Math.atan2(-(aimX - x), -(aimZ - z)) };
}
