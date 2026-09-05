import { describe, expect, it } from 'vitest';
import { FlockStore } from './store';

const tuple = (id: number, x = 0): [number, number, number, number, number, number, number, number] => [id, x, 100, 0, 0, 0, 0, 40];

describe('FlockStore', () => {
  it('meets a pilot from the same frame that first places them', () => {
    const s = new FlockStore();
    s.apply({ t: 1, j: [[7, 'zorro-andino-42', '#F5C542']], p: [tuple(7, 5)], n: 3 }, 1000);
    const r = s.remotes.get(7)!;
    expect(r.codename).toBe('zorro-andino-42');
    expect(r.color).toBe('#F5C542');
    expect(r.raw.x).toBe(5);
    expect(r.receivedAt).toBe(1000);
    expect(r.shown).toBeNull();
    expect(s.online).toBe(3);
  });

  it('updates the pose and keeps what is shown', () => {
    const s = new FlockStore();
    s.apply({ t: 1, p: [tuple(7, 5)] }, 1000);
    s.remotes.get(7)!.shown = { x: 4, y: 100, z: 0, yaw: 0, pitch: 0, roll: 0, speed: 40 };
    s.apply({ t: 2, p: [tuple(7, 9)] }, 1100);
    const r = s.remotes.get(7)!;
    expect(r.raw.x).toBe(9);
    expect(r.receivedAt).toBe(1100);
    expect(r.shown?.x).toBe(4);
  });

  it('renames a pilot already in view', () => {
    const s = new FlockStore();
    s.apply({ t: 1, j: [[7, 'a', '#fff']], p: [tuple(7)] }, 1000);
    s.apply({ t: 2, j: [[7, 'b', '#000']] }, 1100);
    expect(s.remotes.get(7)).toMatchObject({ codename: 'b', color: '#000' });
  });

  it('drops pilots on leave and on silence, keeps the count', () => {
    const s = new FlockStore();
    s.apply({ t: 1, p: [tuple(1), tuple(2)], n: 2 }, 1000);
    s.apply({ t: 2, l: [1] }, 1100);
    expect([...s.remotes.keys()]).toEqual([2]);
    s.apply({ t: 3, p: [tuple(3)] }, 5000);
    expect(s.prune(8000)).toEqual([2]);
    expect([...s.remotes.keys()]).toEqual([3]);
    expect(s.online).toBe(2);
  });
});

describe('FlockStore roster', () => {
  it('parses the roster and the directory, and lists the others with the best position known', () => {
    const s = new FlockStore();
    s.apply({ t: 1, d: [[1, 'me', '#fff'], [2, 'far', '#abc'], [7, 'near', '#f00']], r: '1:0:100:0 2:5000:250:13 7:10:100:0' }, 1000);
    expect(s.roster.size).toBe(3);
    expect(s.identity(2)).toEqual({ codename: 'far', color: '#abc' });
    s.apply({ t: 2, j: [[7, 'near', '#f00']], p: [tuple(7, 12)] }, 1010);
    const others = s.others(1);
    expect(others.map((o) => o.id).sort()).toEqual([2, 7]);
    expect(others.find((o) => o.id === 7)).toMatchObject({ x: 12, precise: true, yaw: 0 });
    expect(others.find((o) => o.id === 2)).toMatchObject({ x: 5000, y: 250, z: 13, codename: 'far', precise: false, yaw: null });
  });

  it('replaces the roster whole and forgets a stale one', () => {
    const s = new FlockStore();
    s.apply({ t: 1, r: '2:0:0:0 3:0:0:0' }, 1000);
    s.apply({ t: 2, r: '3:1:1:1' }, 3000);
    expect([...s.roster.keys()]).toEqual([3]);
    const v = s.rosterVersion;
    s.prune(3000 + 100);
    expect(s.roster.size).toBe(1);
    s.prune(3000 + 9000);
    expect(s.roster.size).toBe(0);
    expect(s.rosterVersion).toBe(v + 1);
  });

  it('ignores a malformed roster entry', () => {
    const s = new FlockStore();
    s.apply({ t: 1, r: '2:0:0:0 x:y 3:1:1' }, 1000);
    expect([...s.roster.keys()]).toEqual([2]);
  });
});

describe('FlockStore names', () => {
  it('names a remote met without an introduction from the directory', () => {
    const s = new FlockStore();
    s.apply({ t: 1, d: [[7, 'zorro-andino-42', '#F5C542']], r: '7:0:0:0' }, 1000);
    s.apply({ t: 2, p: [tuple(7)] }, 1100);
    expect(s.remotes.get(7)?.codename).toBe('zorro-andino-42');
    expect(s.identity(7).codename).toBe('zorro-andino-42');
    expect(s.others(null)[0]).toMatchObject({ codename: 'zorro-andino-42', color: '#F5C542', precise: true });
  });

  it('keeps a silent remote the roster still lists', () => {
    const s = new FlockStore();
    s.apply({ t: 1, p: [tuple(7), tuple(8)], r: '7:0:0:0' }, 1000);
    expect(s.prune(1000 + 7000)).toEqual([8]);
    expect(s.remotes.has(7)).toBe(true);
  });
});
