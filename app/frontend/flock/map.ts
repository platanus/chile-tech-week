// The other condors on the map of Chile: small marks, clustered (cluster.ts) so a crowd reads as
// a few sized dots rather than a smear, drawn between the country and the local condor's red
// arrow, which stays the only thing on the map with a heading and a glow. The marks are
// recomputed only when the roster changes or the map is rebuilt; the draw itself is per frame.
import { clusterPoints, clusterRadius, type Cluster } from './cluster';
import type { SceneHooks } from './hooks';
import type { FlockStore } from './store';

const CELL_PX = 6;

export class FlockMap {
  private clusters: Cluster[] = [];
  private cacheKey = '';
  private selfId: number | null = null;

  constructor(
    private readonly hooks: SceneHooks,
    private readonly store: FlockStore,
  ) {
    hooks.mapOverlay = (ctx, mapPx, w, h) => this.draw(ctx, mapPx, w, h);
  }

  setSelf(id: number | null) {
    this.selfId = id;
  }

  private draw(ctx: CanvasRenderingContext2D, mapPx: (kmX: number, kmZ: number) => [number, number], w: number, h: number) {
    const terrain = this.hooks.terrain();
    if (!terrain) return;
    const key = `${this.store.rosterVersion}/${this.store.remotes.size}/${w}x${h}`;
    if (key !== this.cacheKey) {
      this.cacheKey = key;
      const points = this.store.others(this.selfId).map((o) => {
        const [px, py] = mapPx(o.x / terrain.upk, terrain.zKm(o.z));
        return { px, py, color: o.color };
      });
      this.clusters = clusterPoints(points, CELL_PX);
    }
    if (!this.clusters.length) return;
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(0,0,0,.75)';
    for (const c of this.clusters) {
      const r = clusterRadius(c.n);
      ctx.beginPath();
      ctx.arc(c.px, c.py, r, 0, Math.PI * 2);
      ctx.fillStyle = c.color ?? 'rgba(255,255,255,.95)';
      ctx.fill();
      ctx.stroke();
      if (c.n >= 5) {
        // a crowd: its size beside the mark, with a dark edge so it reads over the white country
        ctx.font = 'bold 8px "Space Mono", ui-monospace, monospace';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        ctx.lineWidth = 2.5;
        ctx.strokeText(String(c.n), c.px + r + 2, c.py);
        ctx.fillStyle = '#fff';
        ctx.fillText(String(c.n), c.px + r + 2, c.py);
        ctx.lineWidth = 1;
      }
    }
  }
}
