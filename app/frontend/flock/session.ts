// Who this pilot is, over HTTP: FlockSessionsController creates them on the first flight and
// keeps the id in a signed cookie; the socket only ever presents that cookie. The last known
// pilot is cached in localStorage so the HUD can show a name before the request returns.
import { flock_session_path } from '@/routes';
import type { Pilot } from './protocol';

const CACHE = 'condor:pilot';

export class SessionError extends Error {}

export function cachedPilot(): Pilot | null {
  try {
    const raw = localStorage.getItem(CACHE);
    return raw ? (JSON.parse(raw) as Pilot) : null;
  } catch {
    return null;
  }
}

function remember(pilot: Pilot) {
  try {
    localStorage.setItem(CACHE, JSON.stringify({ id: pilot.id, codename: pilot.codename, color: pilot.color }));
  } catch {
    /* private mode, storage blocked: the server still knows */
  }
}

async function call(method: 'POST' | 'PATCH', body?: Record<string, string>): Promise<Pilot> {
  const token = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
  const res = await fetch(flock_session_path(), {
    method,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRF-Token': token },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as Pilot & { error?: string };
  if (!res.ok) throw new SessionError(data.error ?? `error ${res.status}`);
  remember(data);
  return data;
}

/** Open (or resume) the pilot's session. `renamed` is set when their codename was taken by
 *  someone online and they got a fresh one. */
export const openSession = () => call('POST');

/** A new codename and/or colour; rejects with the server's Spanish reason. */
export const updateSession = (patch: { codename?: string; color?: string }) => call('PATCH', patch);
