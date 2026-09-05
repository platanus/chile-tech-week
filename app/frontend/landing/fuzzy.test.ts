import { describe, expect, it } from 'vitest';
import { fold, fuzzyMatch, fuzzySearch } from './fuzzy';

const places = ['Santiago', 'Santiago del Estero', 'Puerto Montt', 'Cerro Cóndor', 'Cerro Condoriri', 'Rapa Nui · Hanga Roa', 'Volcán Osorno', 'Punta Arenas'].map((name) => ({ name, key: fold(name) }));
const names = (q: string) => fuzzySearch(q, places, 5).map((r) => r.item.name);

describe('fold', () => {
  it('drops accents and case', () => {
    expect(fold('Cerro Cóndor')).toBe('cerro condor');
    expect(fold('Volcán Ñuble')).toBe('volcan nuble');
  });
});

describe('fuzzyMatch', () => {
  it('needs every word as a subsequence', () => {
    expect(fuzzyMatch('pto montt', 'puerto montt')).not.toBeNull();
    expect(fuzzyMatch('montt pto', 'puerto montt')).not.toBeNull();
    expect(fuzzyMatch('puerto varas', 'puerto montt')).toBeNull();
    expect(fuzzyMatch('', 'puerto montt')).toBeNull();
  });
  it('reports the matched characters in order', () => {
    expect(fuzzyMatch('pm', 'puerto montt')?.indices).toEqual([0, 7]);
  });
});

describe('fuzzySearch', () => {
  it('prefers the shorter exact name', () => {
    expect(names('santiago')[0]).toBe('Santiago');
  });
  it('is accent-insensitive and prefers whole words', () => {
    expect(names('condor')[0]).toBe('Cerro Cóndor');
    expect(names('condor')).toContain('Cerro Condoriri');
  });
  it('finds abbreviations and inserts', () => {
    expect(names('pto montt')[0]).toBe('Puerto Montt');
    expect(names('hanga')[0]).toBe('Rapa Nui · Hanga Roa');
    expect(names('osorno')[0]).toBe('Volcán Osorno');
  });
  it('returns nothing for no match', () => {
    expect(names('xyzzy')).toEqual([]);
  });
});
