// Background only, using the same mesh and placement as the Luma cover.
// node --experimental-strip-types scripts/brand/build-event-background.ts
import { writeFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';
import { buildMesh, BRAND_RED } from '../../app/frontend/brand/mesh.ts';

const width = 1200;
const height = 630;
const mesh = buildMesh({ width: 1600, height: 600, seed: 7, cols: 40, rows: 16, horizon: 0.45, amplitude: 1, steep: 1, coast: 0.5 });
const scale = width * 1.3 / mesh.width;
const x = -width * 0.15;
const y = height * 0.92 - mesh.height * scale * 0.45;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<rect width="${width}" height="${height}" fill="#000"/>
<g transform="translate(${x} ${y}) scale(${scale})" opacity="0.55" fill="#000" stroke="${BRAND_RED}" stroke-width="${1 / scale}" stroke-linejoin="round">
${mesh.rows.map(d => `<path d="${d}"/>`).join('\n')}
</g></svg>`;
writeFileSync('public/brand/event-opengraph-background.svg', svg);
writeFileSync('public/brand/event-opengraph-background.png', new Resvg(svg).render().asPng());
