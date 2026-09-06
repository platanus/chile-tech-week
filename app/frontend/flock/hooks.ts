// What scene.ts hands the flock (window.condorScene.flock): the pieces of the scene the other
// condors are drawn into, read-only from here. Kept in one interface so the untyped scene and
// the typed flock agree on exactly one surface.
import type * as THREE from 'three';
import type { Place } from './places';

export interface CondorMesh {
  parts: THREE.Object3D[];
  wingL: THREE.Object3D;
  wingR: THREE.Object3D;
  dispose(): void;
}

/** Where a teleport lands, world units in the local copy of the strip, level on `yaw`. Not
 *  `precise` while it comes from the coarse roster: the scene waits a little for a better one. */
export interface Landing {
  x: number;
  y: number;
  z: number;
  yaw: number;
  precise: boolean;
}

/** Draws over the map of Chile between the country and the local condor: `mapPx` turns km east
 *  of the centreline and km south of the north edge into map pixels; the canvas is `w` × `h`. */
export type MapOverlay = (ctx: CanvasRenderingContext2D, mapPx: (kmX: number, kmZ: number) => [number, number], w: number, h: number) => void;

export interface SceneHooks {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  /** The local bird: position, attitude and the speed it is flying at right now. */
  condor: { pos: THREE.Vector3; yaw: number; pitch: number; roll: number; speed: number };
  keys: Record<string, boolean>;
  P: {
    turnRate: number;
    bankAngle: number;
    viewDistance: number;
    condorScale: number;
    flapSpeed: number;
    flapAmount: number;
    peakLabelRange: number;
  };
  /** The terrain, once built: strip length, units per km and per metre of elevation, a height
   *  probe, and the km south of the north edge for any z (the fold onto the real relief). */
  terrain(): { L: number; upk: number; vs: number; height(x: number, z: number): number; zKm(z: number): number } | null;
  /** Every populated place of the index (empty until the terrain is in). */
  cities(): Place[];
  makeCondor(): CondorMesh;
  mode(): 'ambient' | 'game';
  /** The map's fade, then the bird lands where `at()` says at that moment (a moving target is
   *  read once the screen is black); tiles stream toward (kmX, kmZ) meanwhile. False when a
   *  flight cannot start one now (ambient mode, a crash under way). */
  teleportBeside(kmX: number, kmZ: number, at: () => Landing | null, label: string): boolean;
  /** Set by the flock: the other condors on the map. */
  mapOverlay?: MapOverlay;
}

/** What the flock exposes back to the scene (window.condorFlock). */
export interface FlockHooks {
  frame(dt: number): void;
  setMode(mode: 'ambient' | 'game'): void;
  /** What the flock knows right now, for the console and the tests. */
  stats(): { role: string | null; connected: boolean; online: number; remotes: number; roster: number; directory: number; unnamed: number; lastSentAt: number };
}

declare global {
  interface Window {
    /** scene.ts installs this synchronously in startScene(); `flock` is the surface above. */
    condorScene?: {
      flock?: SceneHooks;
      /** 0…1 from the touch throttle lever (landing/touch.ts): cruise up to the wheel's top speed. */
      setThrottle?(v: number): void;
    };
    /** startFlock() installs this; scene.ts calls it if present. */
    condorFlock?: FlockHooks;
  }
}
