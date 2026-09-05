// The pilot's corner of the game UI, top right under the exit button: their codename in their
// colour (click to rename) and colour dot (click to pick another); the nearest condors, each with
// a heading arrow, the distance over the ground, a climb arrow and the altitude difference, all
// live; and the button that counts everyone flying and opens the roster (roster.ts). Plus the
// small count under the play button while the landing is in ambient mode.
import { relate } from './math';
import type { Pilot } from './protocol';
import type { FlockStore, Other } from './store';

const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

export const NEAREST = 3;
const NEAREST_MS = 100; // the readout refreshes at 10 Hz: live, without a DOM write per frame

export const fmtKm = (units: number, upk: number) => {
  const km = units / upk;
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
};
/** `vs`: world units per metre of elevation (the scene exaggerates the relief). */
export const fmtClimb = (units: number, vs: number) => {
  const m = Math.round(units / vs);
  return `${m > 0 ? '+' : m < 0 ? '−' : ''}${Math.abs(m)} m`;
};

interface Row {
  li: HTMLLIElement;
  name: HTMLButtonElement;
  dir: HTMLElement;
  km: HTMLElement;
  climb: HTMLElement;
  m: HTMLElement;
  id: number;
}

export class PilotHud {
  private readonly root = el<HTMLDivElement>('pilot');
  private readonly dot = el<HTMLButtonElement>('pilot-color');
  private readonly nameButton = el<HTMLButtonElement>('pilot-name');
  private readonly swatches = el<HTMLDivElement>('pilot-swatches');
  private readonly near = el<HTMLUListElement>('pilot-near');
  private readonly all = el<HTMLButtonElement>('pilot-all');
  private readonly count = el<HTMLSpanElement>('pilot-count');
  private readonly msg = el<HTMLDivElement>('pilot-msg');
  private readonly heroCount = el<HTMLDivElement>('flockcount');
  private pilot: Pilot | null = null;
  private msgTimer = 0;
  private rows: Row[] = [];
  private nearestAt = -Infinity;

  constructor(
    private readonly palette: string[],
    private readonly actions: {
      rename(codename: string): Promise<Pilot>;
      recolor(color: string): Promise<Pilot>;
      /** Fly to this condor's side. */
      visit(id: number): void;
      toggleRoster(): void;
    },
  ) {
    this.dot.addEventListener('click', () => {
      this.swatches.hidden = !this.swatches.hidden;
    });
    this.nameButton.addEventListener('click', () => this.edit());
    this.all.addEventListener('click', () => this.actions.toggleRoster());
    for (const color of this.palette) {
      const b = document.createElement('button');
      b.type = 'button';
      b.style.background = color;
      b.setAttribute('aria-label', color);
      b.addEventListener('click', () => this.pick(color));
      this.swatches.appendChild(b);
    }
  }

  setPilot(pilot: Pilot | null) {
    this.pilot = pilot;
    this.root.classList.toggle('ready', !!pilot);
    if (!pilot) return;
    this.nameButton.textContent = pilot.codename;
    this.root.style.setProperty('--pilot', pilot.color);
    for (const b of this.swatches.children) {
      (b as HTMLButtonElement).setAttribute('aria-pressed', String((b as HTMLButtonElement).style.background === this.cssColor(pilot.color)));
    }
    if (pilot.renamed) this.say(`tu nombre estaba en uso: ahora eres ${pilot.codename}`, 'ok', 6000);
  }

  setOnline(n: number, playing: boolean) {
    const others = playing ? Math.max(0, n - 1) : n;
    const text = others === 0 ? (playing ? 'vuelas solo' : '') : others === 1 ? '1 cóndor más en vuelo' : `${others} cóndores en vuelo`;
    this.count.textContent = playing ? text : '';
    this.all.disabled = !playing || others === 0;
    this.heroCount.textContent = playing ? '' : text;
    this.heroCount.hidden = playing || others === 0;
  }

  setStatus(status: 'connecting' | 'online' | 'offline') {
    this.root.dataset.status = status;
    if (status === 'offline') this.say('sin conexión, reintentando…', 'error', 0);
    else if (this.msg.textContent?.startsWith('sin conexión')) this.say('', 'ok', 0);
  }

  setRosterOpen(open: boolean) {
    this.all.classList.toggle('open', open);
    this.all.setAttribute('aria-expanded', String(open));
  }

  /** The nearest condors, from the local bird's point of view; called every frame, works at 10 Hz. */
  updateNearest(store: FlockStore, viewer: { x: number; y: number; z: number; yaw: number }, L: number, upk: number, vs: number, now: number) {
    if (now - this.nearestAt < NEAREST_MS) return;
    this.nearestAt = now;
    const ranked = nearestOf(store.others(this.pilot?.id ?? null), viewer, L, NEAREST);
    while (this.rows.length > ranked.length) this.rows.pop()!.li.remove();
    ranked.forEach(({ other, rel }, i) => {
      const row = this.rows[i] ?? this.addRow();
      if (row.id !== other.id) {
        row.id = other.id;
        row.li.classList.remove('fresh');
        void row.li.offsetWidth; // restart the arrival transition
        row.li.classList.add('fresh');
      }
      if (row.name.textContent !== other.codename) row.name.textContent = other.codename;
      if (row.li.style.getPropertyValue('--c') !== other.color) row.li.style.setProperty('--c', other.color);
      row.li.classList.toggle('coarse', !other.precise);
      row.dir.style.transform = `rotate(${((rel.bearing * 180) / Math.PI).toFixed(0)}deg)`;
      const km = fmtKm(rel.ground, upk);
      if (row.km.textContent !== km) row.km.textContent = km;
      const m = fmtClimb(rel.climb, vs);
      if (row.m.textContent !== m) row.m.textContent = m;
      const level = Math.abs(rel.climb / vs) < 10;
      row.climb.classList.toggle('level', level);
      row.climb.style.transform = rel.climb >= 0 ? '' : 'rotate(180deg)';
    });
  }

  private addRow(): Row {
    const li = document.createElement('li');
    const name = document.createElement('button');
    name.type = 'button';
    name.className = 'name';
    name.title = 'Volar a su lado';
    const dir = arrow('dir');
    const km = document.createElement('span');
    km.className = 'km';
    const climb = arrow('climb');
    const m = document.createElement('span');
    m.className = 'm';
    li.append(name, dir, km, climb, m);
    this.near.append(li);
    const row: Row = { li, name, dir, km, climb, m, id: -1 };
    name.addEventListener('click', () => this.actions.visit(row.id));
    this.rows.push(row);
    return row;
  }

  private cssColor(hex: string) {
    // the browser normalises `style.background` to rgb(); compare through an element
    const probe = document.createElement('i');
    probe.style.background = hex;
    return probe.style.background;
  }

  private edit() {
    if (!this.pilot || this.nameButton.hidden) return;
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 24;
    input.value = this.pilot.codename;
    input.setAttribute('aria-label', 'Tu nombre de cóndor');
    input.spellcheck = false;
    this.nameButton.hidden = true;
    this.nameButton.after(input);
    input.focus();
    input.select();
    const close = () => {
      input.remove();
      this.nameButton.hidden = false;
    };
    input.addEventListener('keydown', async (e) => {
      e.stopPropagation();
      if (e.key === 'Escape') return close();
      if (e.key !== 'Enter') return;
      const value = input.value.trim();
      if (!value || value === this.pilot?.codename) return close();
      input.disabled = true;
      try {
        this.setPilot(await this.actions.rename(value));
        this.say(`ahora eres ${this.pilot?.codename}`, 'ok');
        close();
      } catch (err) {
        this.say(err instanceof Error ? err.message : 'no se pudo cambiar', 'error');
        input.disabled = false;
        input.focus();
      }
    });
    input.addEventListener('blur', () => setTimeout(() => input.isConnected && close(), 150));
  }

  private async pick(color: string) {
    try {
      this.setPilot(await this.actions.recolor(color));
      this.swatches.hidden = true;
    } catch (err) {
      this.say(err instanceof Error ? err.message : 'no se pudo cambiar', 'error');
    }
  }

  private say(text: string, kind: 'ok' | 'error', ms = 3000) {
    clearTimeout(this.msgTimer);
    this.msg.textContent = text;
    this.msg.classList.toggle('ok', kind === 'ok');
    if (ms > 0) this.msgTimer = window.setTimeout(() => (this.msg.textContent = ''), ms);
  }
}

/** An arrow glyph that rotates with a CSS transform: up is ahead (or a climb). */
function arrow(cls: string) {
  const span = document.createElement('span');
  span.className = cls;
  span.setAttribute('aria-hidden', 'true');
  span.innerHTML = '<svg viewBox="0 0 12 12" width="11" height="11"><path d="M6 1 L10.5 10 L6 7.6 L1.5 10 Z" fill="currentColor"/></svg>';
  return span;
}

/** The `limit` nearest others, nearest first, each with its relation to the viewer. */
export function nearestOf(others: Other[], viewer: { x: number; y: number; z: number; yaw: number }, L: number, limit: number) {
  const ranked = others.map((other) => ({ other, rel: relate(viewer, other, L) }));
  ranked.sort((a, b) => a.rel.distance - b.rel.distance);
  return ranked.slice(0, limit);
}
