// The nearest populated place to a point: a reference for where a condor is ("cerca de Talca").
// Places are sorted by kmZ once; a lookup walks outward from the binary-searched row and stops as
// soon as the distance along z alone exceeds the best found, so hundreds of lookups a second cost
// almost nothing. Only towns and cities: summits are not references, they are destinations.

export interface Place {
  name: string;
  kmX: number;
  kmZ: number;
  pop: number;
}

export class PlaceIndex {
  private readonly rows: Place[];

  constructor(places: Place[]) {
    this.rows = [...places].sort((a, b) => a.kmZ - b.kmZ);
  }

  get size() {
    return this.rows.length;
  }

  nearest(kmX: number, kmZ: number): (Place & { km: number }) | null {
    const rows = this.rows;
    if (!rows.length) return null;
    let lo = 0;
    let hi = rows.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (rows[mid].kmZ < kmZ) lo = mid + 1;
      else hi = mid;
    }
    let best: Place | null = null;
    let bestD = Infinity;
    const consider = (p: Place) => {
      const d = Math.hypot(p.kmX - kmX, p.kmZ - kmZ);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    };
    for (let i = lo; i < rows.length && rows[i].kmZ - kmZ < bestD; i++) consider(rows[i]);
    for (let i = lo - 1; i >= 0 && kmZ - rows[i].kmZ < bestD; i--) consider(rows[i]);
    return best ? { ...(best as Place), km: bestD } : null;
  }
}
