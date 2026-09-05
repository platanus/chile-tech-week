// The wire vocabulary shared with Flock::World (app/lib/flock/world.rb): what a pilot sends and
// what a frame from the server carries. Positions travel as tuples to keep frames small.

/** [id, x, y, z, yaw, pitch, roll, speed] — world units, radians, units per second. */
export type PoseTuple = [number, number, number, number, number, number, number, number];

/** A frame: the positions due this tick, the pilots the viewer has not met, the ids that left
 *  the viewer's range, the count of pilots online, the roster ("id:x:y:z …", whole units, z
 *  folded onto the real relief, everyone flying) and the directory (id, codename, colour of
 *  everyone, only when it changed). Every key but `t` is optional. */
export interface Frame {
  t: number;
  p?: PoseTuple[];
  j?: [number, string, string][];
  l?: number[];
  n?: number;
  r?: string;
  d?: [number, string, string][];
}

/** A pilot's own position; `u` marks an update that follows an input change. */
export interface MoveMessage {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  roll: number;
  s: number;
  u?: 1;
}

/** The pilot as FlockSessionsController describes them. */
export interface Pilot {
  id: number;
  codename: string;
  color: string;
  renamed?: boolean;
  palette?: string[];
}

export type Role = 'player' | 'spectator';
