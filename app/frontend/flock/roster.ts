// Everyone flying, in a panel under the pilot's corner: sorted by distance, filtered as you type
// (the same fuzzy match as the place search), each with the live distance and the nearest town
// as a reference for where they are. A click on a row flies you to that condor's side. Distances
// refresh a few times a second; the order and the towns once a second, so rows do not shuffle
// under the pointer. Rows are reused by id, and a very long list is capped: the filter reaches
// the rest.
import { fold, fuzzyMatch } from '@/landing/fuzzy';
import { fmtKm } from './hud';
import { relate } from './math';
import type { PlaceIndex } from './places';
import type { FlockStore, Other } from './store';

const DISTANCE_MS = 250;
const ORDER_MS = 1000;
const MAX_ROWS = 150;

const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

interface Row {
  li: HTMLLIElement;
  name: HTMLElement;
  km: HTMLElement;
  place: HTMLElement;
  id: number;
  rel: { ground: number; distance: number };
}

export class RosterPanel {
  private readonly panel = el<HTMLDivElement>('roster');
  private readonly input = el<HTMLInputElement>('roster-input');
  private readonly list = el<HTMLUListElement>('roster-list');
  private readonly foot = el<HTMLDivElement>('roster-foot');
  private readonly rows = new Map<number, Row>();
  private order: Row[] = [];
  private selfId: number | null = null;
  private orderedAt = -Infinity;
  private distancedAt = -Infinity;
  private query = '';

  constructor(
    private readonly store: FlockStore,
    private readonly places: () => PlaceIndex | null,
    private readonly actions: { visit(id: number): void; onToggle(open: boolean): void },
  ) {
    this.input.addEventListener('input', () => {
      this.query = this.input.value.trim();
      this.orderedAt = -Infinity;
    });
    this.input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Escape') this.close();
    });
  }

  get open() {
    return !this.panel.hidden;
  }

  setSelf(id: number | null) {
    this.selfId = id;
  }

  toggle() {
    if (this.open) this.close();
    else this.show();
  }

  show() {
    this.panel.hidden = false;
    this.input.value = '';
    this.query = '';
    this.orderedAt = -Infinity;
    this.actions.onToggle(true);
    this.input.focus();
  }

  close() {
    if (!this.open) return;
    this.panel.hidden = true;
    this.actions.onToggle(false);
    document.getElementById('exit')?.focus?.({ preventScroll: true });
  }

  /** Called every frame while the panel is open; does its work at its own cadences. */
  update(viewer: { x: number; y: number; z: number; yaw: number }, L: number, upk: number, zKm: (z: number) => number, now: number) {
    if (!this.open) return;
    if (now - this.orderedAt >= ORDER_MS) {
      this.orderedAt = now;
      this.distancedAt = now;
      this.reorder(viewer, L, upk, zKm);
    } else if (now - this.distancedAt >= DISTANCE_MS) {
      this.distancedAt = now;
      const byId = new Map(this.store.others(this.selfId).map((o) => [o.id, o]));
      for (const row of this.order) {
        const o = byId.get(row.id);
        if (!o) continue;
        row.rel = relate(viewer, o, L);
        const km = fmtKm(row.rel.ground, upk);
        if (row.km.textContent !== km) row.km.textContent = km;
      }
    }
  }

  private reorder(viewer: { x: number; y: number; z: number; yaw: number }, L: number, upk: number, zKm: (z: number) => number) {
    const q = fold(this.query);
    let others = this.store.others(this.selfId);
    const matches = new Map<number, number[]>();
    if (q) {
      others = others.filter((o) => {
        const m = fuzzyMatch(q, fold(o.codename));
        if (m) matches.set(o.id, m.indices);
        return !!m;
      });
    }
    const ranked = others.map((o) => ({ o, rel: relate(viewer, o, L) })).sort((a, b) => a.rel.distance - b.rel.distance);
    const shown = ranked.slice(0, MAX_ROWS);
    const places = this.places();
    const keep = new Set<number>();
    this.order = shown.map(({ o, rel }) => {
      keep.add(o.id);
      const row = this.rows.get(o.id) ?? this.addRow(o.id);
      row.rel = rel;
      this.renderName(row, o, matches.get(o.id));
      row.li.style.setProperty('--c', o.color);
      row.li.classList.toggle('coarse', !o.precise);
      row.km.textContent = fmtKm(rel.ground, upk);
      const near = places?.nearest(o.x / upk, zKm(o.z));
      const text = near ? (near.km < 8 ? near.name : `${near.name} · ${Math.round(near.km)} km`) : '';
      if (row.place.textContent !== text) row.place.textContent = text;
      return row;
    });
    for (const [id, row] of this.rows) {
      if (keep.has(id)) continue;
      row.li.remove();
      this.rows.delete(id);
    }
    // the DOM follows the ranking: only rows out of place move
    let cursor = this.list.firstElementChild;
    for (const row of this.order) {
      if (cursor === row.li) cursor = cursor.nextElementSibling;
      else this.list.insertBefore(row.li, cursor);
    }
    const hidden = ranked.length - shown.length;
    this.foot.textContent =
      hidden > 0 ? `y ${hidden} más: filtra por nombre` : ranked.length === 0 ? (q ? 'Sin resultados' : 'Nadie más en vuelo') : '';
  }

  private addRow(id: number): Row {
    const li = document.createElement('li');
    li.setAttribute('role', 'option');
    const name = document.createElement('b');
    const km = document.createElement('span');
    km.className = 'km';
    const place = document.createElement('span');
    place.className = 'place';
    li.append(name, km, place);
    li.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.close();
      this.actions.visit(id);
    });
    const row: Row = { li, name, km, place, id, rel: { ground: 0, distance: 0 } };
    this.rows.set(id, row);
    return row;
  }

  private renderName(row: Row, o: Other, hits?: number[]) {
    const key = `${o.codename}|${hits?.join(',') ?? ''}`;
    if (row.name.dataset.key === key) return;
    row.name.dataset.key = key;
    row.name.textContent = '';
    if (!hits) {
      row.name.textContent = o.codename;
      return;
    }
    // the matched letters in red, like the place search (names are text nodes, never markup)
    const hit = new Set(hits);
    let run = '';
    let runHit = false;
    const flush = () => {
      if (!run) return;
      if (runHit) {
        const mark = document.createElement('mark');
        mark.textContent = run;
        row.name.append(mark);
      } else row.name.append(document.createTextNode(run));
      run = '';
    };
    [...o.codename].forEach((ch, k) => {
      const h = hit.has(k);
      if (h !== runHit) {
        flush();
        runHit = h;
      }
      run += ch;
    });
    flush();
  }
}
