// What this client knows about the other condors: the last pose the server sent for each, when
// it arrived, and who they are. Frames are applied here; rendering reads from here.
import type { Pose as MathPose } from './math';
import type { Frame } from './protocol';

export interface Remote {
  id: number;
  codename: string;
  color: string;
  /** The last pose received, in the sender's own copy of the strip. */
  raw: MathPose;
  /** performance.now() when `raw` arrived. */
  receivedAt: number;
  /** What is currently drawn (in the local copy); null until the first frame is rendered. */
  shown: MathPose | null;
  /** Wing-flap phase, so a flock does not beat in unison. */
  phase: number;
}

/** A pilot anywhere in the sky, as the roster last placed them: whole units, z folded. */
export interface Sighting {
  id: number;
  x: number;
  y: number;
  z: number;
}

/** Remotes not heard from for this long are dropped even without a leave: the far tier only
 *  refreshes once a second, and a leave can be lost with the socket. */
export const STALE_MS = 6000;
/** The roster comes every 2 s; one this old belongs to a connection that is gone. */
export const ROSTER_STALE_MS = 8000;

export class FlockStore {
  readonly remotes = new Map<number, Remote>();
  /** Everyone flying, coarsely (the local pilot included), by id. */
  readonly roster = new Map<number, Sighting>();
  /** Who everyone is, by id; the remotes carry their own copy. */
  readonly directory = new Map<number, { codename: string; color: string }>();
  /** Bumped whenever the roster changes, so its consumers can cache what they derive from it. */
  rosterVersion = 0;
  /** Pilots online, as the server last counted them (spectators excluded). */
  online = 0;
  /** Names and colours announced ahead of a position, by id. */
  private readonly pending = new Map<number, { codename: string; color: string }>();
  private rosterAt = -Infinity;

  apply(frame: Frame, now: number) {
    if (frame.d) {
      this.directory.clear();
      for (const [id, codename, color] of frame.d) this.directory.set(id, { codename, color });
    }
    if (frame.r !== undefined) {
      this.roster.clear();
      for (const entry of frame.r.split(' ')) {
        if (!entry) continue;
        const [id, x, y, z] = entry.split(':').map(Number);
        if (!Number.isFinite(id) || !Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) continue;
        this.roster.set(id, { id, x, y, z });
      }
      this.rosterAt = now;
      this.rosterVersion++;
    }
    for (const [id, codename, color] of frame.j ?? []) {
      const r = this.remotes.get(id);
      if (r) {
        r.codename = codename;
        r.color = color;
      } else this.pending.set(id, { codename, color });
    }
    for (const [id, x, y, z, yaw, pitch, roll, speed] of frame.p ?? []) {
      const raw = { x, y, z, yaw, pitch, roll, speed };
      const r = this.remotes.get(id);
      if (r) {
        r.raw = raw;
        r.receivedAt = now;
      } else {
        const meta = this.pending.get(id) ?? this.directory.get(id) ?? { codename: '', color: '#ffffff' };
        this.pending.delete(id);
        this.remotes.set(id, { id, ...meta, raw, receivedAt: now, shown: null, phase: Math.random() * 100 });
      }
    }
    for (const id of frame.l ?? []) {
      this.remotes.delete(id);
      this.pending.delete(id);
    }
    if (frame.n !== undefined) this.online = frame.n;
  }

  /** Ids dropped for silence, unless the roster still lists them: a pilot who has stopped moving
   *  is not resent, but is still there. A stale roster is forgotten whole. */
  prune(now: number, staleMs = STALE_MS): number[] {
    const gone: number[] = [];
    for (const [id, r] of this.remotes) if (now - r.receivedAt > staleMs && !this.roster.has(id)) gone.push(id);
    for (const id of gone) this.remotes.delete(id);
    if (this.roster.size && now - this.rosterAt > ROSTER_STALE_MS) {
      this.roster.clear();
      this.rosterVersion++;
    }
    return gone;
  }

  /** Who a pilot is, from the nearest source: the remote in view, else the directory. */
  identity(id: number): { codename: string; color: string } {
    const r = this.remotes.get(id);
    return (r?.codename ? r : null) ?? this.directory.get(id) ?? r ?? { codename: '', color: '#ffffff' };
  }

  /** Every other pilot with the best position known for them: the shown (dead-reckoned) pose of
   *  a remote in view, else the roster's coarse sighting. Precise ones carry their heading. */
  others(selfId: number | null): Other[] {
    const out: Other[] = [];
    for (const r of this.remotes.values()) {
      if (r.id === selfId) continue;
      const p = r.shown ?? r.raw;
      const who = this.identity(r.id);
      out.push({ id: r.id, codename: who.codename, color: who.color, x: p.x, y: p.y, z: p.z, yaw: p.yaw, precise: true });
    }
    for (const s of this.roster.values()) {
      if (s.id === selfId || this.remotes.has(s.id)) continue;
      const who = this.identity(s.id);
      out.push({ id: s.id, codename: who.codename, color: who.color, x: s.x, y: s.y, z: s.z, yaw: null, precise: false });
    }
    return out;
  }

  clear() {
    this.remotes.clear();
    this.pending.clear();
    this.roster.clear();
    this.directory.clear();
    this.rosterVersion++;
  }
}

export interface Other {
  id: number;
  codename: string;
  color: string;
  x: number;
  y: number;
  z: number;
  /** Known for a remote in view (radians); null for a roster sighting. */
  yaw: number | null;
  precise: boolean;
}
