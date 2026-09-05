// Multiplayer: the flock of other condors over the same relief. The scene stays single-player;
// this wires its hooks (window.condorScene.flock) to the socket, the store, the renderer, the
// map marks, the HUD and the roster, and hands the scene one `frame(dt)` to call after it has
// moved the local bird.
//
// Ambient mode watches as a spectator (the birds fly through the hero, no name tags, not
// counted). Entering the game opens the pilot's session and re-joins as a player.
import { FlockClient } from './client';
import type { SceneHooks } from './hooks';
import { PilotHud } from './hud';
import { FlockMap } from './map';
import { shouldSend } from './math';
import { PlaceIndex } from './places';
import type { Pilot, Role } from './protocol';
import { FlockRenderer } from './render';
import { RosterPanel } from './roster';
import { cachedPilot, openSession, updateSession } from './session';
import { FlockStore } from './store';
import { landingBeside } from './visit';

const PALETTE = ['#F5C542', '#4FD1C5', '#7AE582', '#B794F6', '#63B3ED', '#F687B3', '#FF8C42', '#FFFFFF'];

export function startFlock() {
  const hooks = window.condorScene?.flock;
  const layer = document.getElementById('peaks');
  if (!hooks || !layer) return;
  start(hooks, layer);
}

function start(hooks: SceneHooks, layer: HTMLElement) {
  const store = new FlockStore();
  const renderer = new FlockRenderer(hooks, layer);
  const map = new FlockMap(hooks, store);
  const client = new FlockClient();
  let places: PlaceIndex | null = null;
  const placeIndex = () => {
    if (!places) {
      const cities = hooks.cities();
      if (cities.length) places = new PlaceIndex(cities);
    }
    return places;
  };
  const roster = new RosterPanel(store, placeIndex, {
    visit: (id) => visit(id),
    onToggle: (open) => hud.setRosterOpen(open),
  });
  const hud = new PilotHud(PALETTE, {
    rename: (codename) => updateSession({ codename }),
    recolor: (color) => updateSession({ color }),
    visit: (id) => visit(id),
    toggleRoster: () => roster.toggle(),
  });

  let role: Role | null = null;
  let pilot: Pilot | null = cachedPilot();
  let lastSentAt = -Infinity;
  let lastInput = '';
  let lastPose = '';
  const setPilot = (p: Pilot | null) => {
    pilot = p;
    hud.setPilot(p);
    map.setSelf(p?.id ?? null);
    roster.setSelf(p?.id ?? null);
  };
  setPilot(pilot);

  // Fly to another condor's side: the landing is read once the screen is black, from wherever
  // they are by then (the store keeps following them through the fade).
  function visit(id: number) {
    const terrain = hooks.terrain();
    const target = store.others(pilot?.id ?? null).find((o) => o.id === id);
    if (!terrain || !target) return;
    const at = () => {
      const t = store.others(pilot?.id ?? null).find((o) => o.id === id) ?? target;
      return landingBeside(t, hooks.condor.pos.z, terrain.L);
    };
    hooks.teleportBeside(target.x / terrain.upk, terrain.zKm(target.z), at, `→ junto a ${target.codename}`);
  }

  const events = {
    onFrame: (frame: Parameters<FlockStore['apply']>[0]) => {
      store.apply(frame, performance.now());
      hud.setOnline(store.online, role === 'player');
    },
    onConnected: () => {
      hud.setStatus('online');
      lastSentAt = -Infinity; // announce ourselves on the next frame
    },
    onDisconnected: () => hud.setStatus('offline'),
    onRejected: () => hud.setStatus('offline'),
  };

  // Switch role: a player needs a session first; a spectator just listens. Only the newest
  // request wins when the mode flips again while the session request is in flight.
  let switching = 0;
  async function become(next: Role) {
    if (role === next) return;
    const ticket = ++switching;
    role = next;
    client.disconnect();
    store.clear();
    renderer.clear();
    roster.close();
    hud.setStatus('connecting');
    if (next === 'player') {
      try {
        setPilot(await openSession());
      } catch {
        hud.setStatus('offline');
        return;
      }
      if (ticket !== switching) return;
    }
    await client.connect(next, events);
  }

  function report(now: number) {
    if (!client.connected || !hooks.terrain()) return;
    const { condor, keys } = hooks;
    const spectator = role !== 'player';
    const input = spectator
      ? ''
      : `${keys.KeyA || keys.ArrowLeft ? 1 : 0}${keys.KeyD || keys.ArrowRight ? 1 : 0}` +
        `${keys.KeyW || keys.ArrowUp || keys.Space ? 1 : 0}${keys.KeyS || keys.ArrowDown || keys.KeyC ? 1 : 0}` +
        `${keys.ShiftLeft || keys.ShiftRight ? 1 : 0}`;
    const urgent = input !== lastInput;
    const pose = `${condor.pos.x.toFixed(1)},${condor.pos.y.toFixed(1)},${condor.pos.z.toFixed(1)},${condor.yaw.toFixed(3)}`;
    if (!shouldSend(now, lastSentAt, { changed: pose !== lastPose, urgent, spectator })) return;
    lastInput = input;
    lastPose = pose;
    lastSentAt = now;
    client.move({
      x: condor.pos.x,
      y: condor.pos.y,
      z: condor.pos.z,
      yaw: condor.yaw,
      pitch: condor.pitch,
      roll: condor.roll,
      s: condor.speed,
      ...(urgent ? { u: 1 as const } : {}),
    });
  }

  window.condorFlock = {
    frame(dt) {
      const now = performance.now();
      if (store.prune(now).length) hud.setOnline(store.online, role === 'player');
      renderer.update(store, dt, now);
      const terrain = hooks.terrain();
      if (terrain && role === 'player') {
        const { condor } = hooks;
        const viewer = { x: condor.pos.x, y: condor.pos.y, z: condor.pos.z, yaw: condor.yaw };
        hud.updateNearest(store, viewer, terrain.L, terrain.upk, terrain.vs, now);
        roster.update(viewer, terrain.L, terrain.upk, terrain.zKm, now);
      }
      report(now);
    },
    setMode(mode) {
      void become(mode === 'game' ? 'player' : 'spectator');
    },
    stats() {
      let unnamed = 0;
      for (const id of store.roster.keys()) if (!store.identity(id).codename) unnamed++;
      return { role, connected: client.connected, online: store.online, remotes: store.remotes.size, roster: store.roster.size, directory: store.directory.size, unnamed, lastSentAt };
    },
  };

  void become(hooks.mode() === 'game' ? 'player' : 'spectator');
}
