// The other condors on screen: a mesh per remote, dead-reckoned every frame from the last pose
// received, plus a name tag in the same layer as the peak labels for the nearest few.
import * as THREE from 'three';
import type { CondorMesh, SceneHooks } from './hooks';
import { advance, blend, localize, type Pose } from './math';
import type { FlockStore, Remote } from './store';

const LABELS_MAX = 12;
const EASE = 6; // per second; how quickly the shown bird converges on the reckoned pose
const MAX_RECKON_S = 1.5;

interface View {
  group: THREE.Group;
  mesh: CondorMesh;
  label: HTMLElement;
  name: HTMLElement;
  sub: HTMLElement;
}

const _v = new THREE.Vector3();

export class FlockRenderer {
  private readonly views = new Map<number, View>();

  constructor(
    private readonly hooks: SceneHooks,
    private readonly layer: HTMLElement,
  ) {}

  update(store: FlockStore, dt: number, now: number) {
    const terrain = this.hooks.terrain();
    if (!terrain) return;
    const { P, camera, condor } = this.hooks;
    const physics = { turnRate: P.turnRate, bank: P.bankAngle };
    const k = 1 - Math.exp(-dt * EASE);
    const showLabels = this.hooks.mode() === 'game';
    const candidates: { view: View; d: number; sx: number; sy: number }[] = [];

    for (const [id, view] of this.views) if (!store.remotes.has(id)) this.drop(id, view);

    for (const r of store.remotes.values()) {
      const view = this.views.get(r.id) ?? this.add(r);
      // where the bird is now, in this client's copy of the strip; the reckoning is capped so a
      // pilot whose updates stall (a throttled tab) glides to a halt instead of flying off
      const age = Math.min((now - r.receivedAt) / 1000, MAX_RECKON_S);
      const target = advance(localize(r.raw, condor.pos.z, terrain.L), age, physics);
      r.shown = r.shown ? blend(r.shown, target, k) : target;
      this.pose(view, r.shown, r, now);
      const d = view.group.position.distanceTo(condor.pos);
      view.group.visible = d < P.viewDistance * 1.2;
      if (view.name.textContent !== r.codename) view.name.textContent = r.codename;
      if (view.label.style.getPropertyValue('--c') !== r.color) view.label.style.setProperty('--c', r.color);

      if (!showLabels || d > P.peakLabelRange) continue;
      _v.copy(view.group.position);
      _v.y += 2.5 * P.condorScale;
      _v.project(camera);
      if (_v.z > 1) continue; // behind the camera
      const sx = ((_v.x + 1) / 2) * innerWidth;
      const sy = ((1 - _v.y) / 2) * innerHeight;
      if (sx < 8 || sx > innerWidth - 180 || sy < 56 || sy > innerHeight - 8) continue;
      if (this.occluded(view.group.position, d, terrain)) continue;
      candidates.push({ view, d, sx, sy });
    }

    candidates.sort((a, b) => a.d - b.d);
    const shown = new Set<View>();
    for (const c of candidates.slice(0, LABELS_MAX)) {
      shown.add(c.view);
      c.view.sub.textContent = `${(c.d / 20).toFixed(1)} km`;
      c.view.label.style.transform = `translate(${c.sx.toFixed(1)}px, ${c.sy.toFixed(1)}px) translateY(-100%)`;
      c.view.label.hidden = false;
    }
    for (const view of this.views.values()) if (!shown.has(view)) view.label.hidden = true;
  }

  clear() {
    for (const [id, view] of this.views) this.drop(id, view);
  }

  private add(r: Remote): View {
    const mesh = this.hooks.makeCondor();
    const group = new THREE.Group();
    group.rotation.order = 'YXZ';
    group.add(...mesh.parts);
    group.scale.setScalar(this.hooks.P.condorScale);
    this.hooks.scene.add(group);

    const label = document.createElement('div');
    label.className = 'peak pilot';
    label.hidden = true;
    const body = document.createElement('div');
    const name = document.createElement('span');
    const sub = document.createElement('span');
    body.append(name, sub);
    label.append(body);
    this.layer.appendChild(label);

    const view = { group, mesh, label, name, sub };
    this.views.set(r.id, view);
    return view;
  }

  private drop(id: number, view: View) {
    this.hooks.scene.remove(view.group);
    view.mesh.dispose();
    view.label.remove();
    this.views.delete(id);
  }

  private pose(view: View, p: Pose, r: Remote, now: number) {
    const { P } = this.hooks;
    view.group.position.set(p.x, p.y, p.z);
    view.group.rotation.set(p.pitch, p.yaw, p.roll);
    const flap = Math.sin((now / 1000 + r.phase) * P.flapSpeed) * P.flapAmount + 0.12 + Math.abs(p.roll) * 0.15;
    view.mesh.wingR.rotation.z = flap;
    view.mesh.wingL.rotation.z = -flap;
  }

  /** A coarse ray march along the terrain, like the scene does for peak labels. */
  private occluded(pos: THREE.Vector3, d: number, terrain: { height(x: number, z: number): number }) {
    const steps = Math.min(12, Math.max(4, Math.round(d / 24)));
    const c = this.hooks.camera.position;
    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      if (terrain.height(c.x + (pos.x - c.x) * t, c.z + (pos.z - c.z) * t) > c.y + (pos.y - c.y) * t + 0.5) return true;
    }
    return false;
  }
}
