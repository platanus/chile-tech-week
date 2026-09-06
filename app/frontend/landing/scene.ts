// @ts-nocheck
// The condor flight over the real Chile relief: the landing's background scene and, behind the
// "Vuela el cóndor" button, the game. Ported verbatim from the <script type="module"> of the
// original single-page index.html (the low-poly-montains prototype, now the chile-tech-week-25
// repo) — the body of that script is the body of startScene(), unchanged, so the two stay
// diffable. It is plain three.js over the DOM the Home/Show page renders (#hero, #play, #exit,
// #hud, #peaks, #toast, #fade, …), untyped on purpose: typing 1,800 lines of shader and mesh
// code is its own task, and @ts-nocheck keeps the port an exact copy in the meantime.
//
// startScene() is called once, after the page has mounted and startLogo() has installed
// window.logoDone (the scene waits for the logo strokes before its first frame).
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import GUI from 'lil-gui';
import { ChileTerrain } from '@/terrain/chile';
import { fold, fuzzySearch } from '@/landing/fuzzy';
import { scatterSpawn } from '@/landing/spawn';

export async function startScene() {

// ---------------------------------------------------------------- params
const DEFAULTS = {
  // cordillera: 'chile' is the real relief (src/terrain: SRTM + OSM peaks, streamed in 64 km tiles),
  // 'procedural' the old noise. Real relief reads flat from the air, so it is exaggerated.
  terrain: 'chile',
  unitsPerKm: 20,          // horizontal scale of the real world (the corridor is 512 km wide)
  exaggeration: 3.0,
  snowLineM: 3800,
  peakLabels: true,
  peakLabelCount: 8,
  peakLabelRange: 2000,
  // cities: waypoints at the horizon for the places ahead of the flight (no range: the next city
  // is shown long before its tiles load, and pinned to the screen edge when it is off to a side)
  cityLabels: true,
  cityLabelCount: 3,
  cityMinPop: 15000,
  cityLabelRange: 8000,    // units (400 km): big cities show at their bearing on the horizon long before their tiles
  // where flights run in the real world: km east of the corridor centreline (roughly the central
  // valley), so the same lane works along the whole country; the start latitude picks the region
  landBase: 2.5,           // land sits this far above the sea plane (waves are ±waveAmp)
  startLat: -33.49,        // Santiago: south-west of the centre, so the Costanera is ahead at ~12 km
  laneKm: 10,              // ambient lane: over the valley with the Andes wall on the right
  startKm: 12,             // game start: km east of the centreline
  startHeading: 50,        // degrees from north, clockwise: at the Gran Torre with El Plomo behind it
  startAimKm: 12,          // the Gran Torre is this far ahead of the start: every scattered spawn aims at it
  spawnSide: 80,           // spawns scatter this far (units) across the heading …
  spawnAlong: 50,          // … and along it, so arriving condors see each other without stacking
  spawnAltitude: 15,       // … and in altitude
  respawnClearance: 40,    // a (re)spawn sits at least this far above the ground along its first stretch
  ambientClearance: 50,    // the autopilot climbs to keep this much above the terrain ahead
  prefetchKm: 80,          // tiles are fetched this far ahead along the heading
  chunkFade: 0.8,          // seconds a new chunk takes to fade in at the fog line
  // city: the buildings layer (Overture footprints aggregated to 250 m cells) becomes a carpet of
  // blocks, one per mesh cell, sized by built-up fraction; named towers are their own prisms.
  // Building heights get extra exaggeration on top of the terrain's, or they would not show.
  showBuildings: true,
  blockMin: 0.06,          // built-up fraction below which a cell stays empty
  blockScale: 2.0,
  blockColor: '#141414',
  blockWire: '#8a8a8a',
  landmarkScale: 1.5,
  landmarkFootprint: 3.5,  // footprints are widened so a 300 m tower is a tower, not a needle
  landmarkWire: '#ffffff',
  // water: the water layer (Overture lakes rasterized to 250 m cells, river centrelines) draws
  // lakes at their real level with the sea's material and rivers as pale draped lines.
  showWater: true,
  riverOpacity: 0.9,
  riverLift: 0.25,         // units above the mesh faces, so a line never sinks into a slope
  lakeLabels: true,
  lakeLabelKm2: 1,         // named lakes at least this big get a pin (size ranks them against the summits)
  // mesh & streaming: square chunks of chunkSize units around the camera, cellSize per vertex.
  // lod (off: the density change as chunks approach is visible) doubles the cell past lodNear
  // and again past lodFar; at constant resolution the whole view is ~200k vertices, which is cheap.
  // quality: 'auto' guesses a tier from the device (GPU class, screen pixels, cores, memory),
  // confirms it against frame times in the first seconds (at most one step down), then locks it
  // for the session: nothing changes in flight. A tier sets viewDistance, fog (2.5 / viewDistance:
  // 8 % visibility at the edge, so nothing invisible is drawn), the pixel-ratio cap and bloom.
  quality: 'auto',
  fogAuto: true,
  cellSize: 8,
  chunkSize: 400,
  viewDistance: 2000,
  backDistance: 300,
  lod: false,
  lodNear: 700,
  lodFar: 1400,
  // shape (procedural)
  seed: 1337,
  size: 1400,
  colorScale: 0.45,
  amplitude: 110,
  scale: 300,
  octaves: 5,
  lacunarity: 2.1,
  gain: 0.5,
  ridgeOffset: 1.0,
  ridgeGain: 2.2,
  peakiness: 1.7,
  baseAmp: 10,
  baseScale: 160,
  rangeBias: 0.6,
  // coast & sea (sea to the west / -x, mountains to the east / +x; the condor flies toward -z, so the mountains are on the right)
  coastOffset: -60,
  coastMeander: 120,
  coastScale: 420,
  shelfWidth: 90,
  beachWidth: 30,
  mountainFalloff: 160,
  seaDepth: 10,
  seaResolution: 350,      // columns across the width: ~16-unit cells, twice the land cell
  waveAmp: 1.4,
  waveFreq: 0.06,
  waveSpeed: 1.0,
  seaDeep: '#383838',
  seaCrest: '#555555',
  seaWireColor: '#858585',
  seaWireOpacity: 0.28,
  // terrain colors
  colorLow: '#140303',
  colorMid: '#4e0b0b',
  colorHigh: '#8c1616',
  colorPeak: '#b81e1e',
  midPoint: 0.3,
  faceShadeFloor: 0.45,
  wireColor: '#ee2b2b',
  wireOpacity: 0.8,
  diagonals: false,
  // snow: faces and wire fade to white above this normalized height
  snowColor: '#ffffff',
  snowLine: 0.68,
  snowBlend: 0.12,
  snowFaceTone: 0.62,
  // sky / sun
  skyTop: '#000000',
  skyHorizon: '#0a0a0a',
  skyBottom: '#000000',
  showSun: false,
  sunTop: '#ffffff',
  sunBottom: '#ee2b2b',
  sunSize: 0.14,
  sunElevation: 0.14,
  sunAzimuth: -0.55,
  stripes: 9,
  glow: 0.4,
  stars: 0.05,
  // atmosphere
  fogColor: '#000000',
  fogDensity: 0.0012,
  lightColor: '#ffffff',
  lightIntensity: 1.2,
  ambient: 0.8,
  toneMapping: 'ACES',
  exposure: 1.15,
  bloom: true,
  bloomStrength: 0.35,
  bloomRadius: 0.45,
  bloomThreshold: 0.9,
  scanlines: false,
  // condor flight
  cameraMode: 'condor',
  showCondor: true,
  condorScale: 1.0,
  flightSpeed: 40,
  turnRate: 0.9,
  bankAngle: 0.7,
  maxPitch: 0.45,
  collisions: true,
  crashMargin: 1.5,
  boundsMargin: 40,
  maxAltitude: 2500,
  camDistance: 27,
  camHeight: 9,
  camLag: 4,
  lookAhead: 12,
  flapAmount: 0.1,
  flapSpeed: 2.4,
  condorBody: '#0a0a0a',
  condorRuff: '#ffffff',
  condorHead: '#ee2b2b',
  condorPatch: '#a3a3a3',
  condorEdge: '#ffffff',
  condorEdgeOpacity: 0.8,
  condorGlow: 0.3,
  // free camera
  flySpeed: 45,
  // landing / ambient mode (the scene behind the hero)
  ambientSpeed: 14,
  ambientAltitude: 120,
  ambientOffset: -30,
  ambientSway: 0.08,
  ambientSide: 10,
  ambientLookUp: 7,
  ambientDistance: 34,
  ambientFps: 30,
  ambientBloom: 0.15,
  // performance
  renderScale: 1.0,
  startOffset: -60,
  startAltitude: 70,
};
const P = { ...DEFAULTS };

// ---------------------------------------------------------------- utils
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeNoise2D(seed) {
  const rand = mulberry32(seed);
  const perm = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
  const p = new Uint8Array(512);
  for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
  const G = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
  const F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;
  return function (xin, yin) {
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s), j = Math.floor(yin + s);
    const t = (i + j) * G2;
    const x0 = xin - (i - t), y0 = yin - (j - t);
    const i1 = x0 > y0 ? 1 : 0, j1 = x0 > y0 ? 0 : 1;
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2, x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
    const ii = i & 255, jj = j & 255;
    let n = 0;
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 > 0) { const g = G[p[ii + p[jj]] & 7]; t0 *= t0; n += t0 * t0 * (g[0] * x0 + g[1] * y0); }
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 > 0) { const g = G[p[ii + i1 + p[jj + j1]] & 7]; t1 *= t1; n += t1 * t1 * (g[0] * x1 + g[1] * y1); }
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 > 0) { const g = G[p[ii + 1 + p[jj + 1]] & 7]; t2 *= t2; n += t2 * t2 * (g[0] * x2 + g[1] * y2); }
    return 70 * n;
  };
}

// ---------------------------------------------------------------- height field
function makeHeightFn(P) {
  const noise = makeNoise2D(P.seed);
  const noise2 = makeNoise2D(P.seed + 999);
  const noise3 = makeNoise2D(P.seed + 4242);

  const noise4 = makeNoise2D(P.seed + 777);

  // coastline x position for a given z (fbm meander)
  const coastX = (z) => P.coastOffset + P.coastMeander * fbm(noise4, z / P.coastScale, 0.37, 3);

  function ridged(x, y) {
    let sum = 0, amp = 1, freq = 1, weight = 1, norm = 0;
    for (let o = 0; o < P.octaves; o++) {
      let n = noise(x * freq + o * 17.3, y * freq - o * 11.7);
      n = Math.max(P.ridgeOffset - Math.abs(n), 0);
      n = n * n * weight;
      weight = clamp(n * P.ridgeGain, 0, 1);
      sum += n * amp;
      norm += amp;
      amp *= P.gain;
      freq *= P.lacunarity;
    }
    return sum / norm;
  }
  function fbm(nz, x, y, oct = 3) {
    let s = 0, a = 1, f = 1, n = 0;
    for (let o = 0; o < oct; o++) { s += nz(x * f, y * f) * a; n += a; a *= 0.5; f *= 2; }
    return s / n;
  }

  return {
    coastX,
    height(x, z) {
      const cx = coastX(z);
      const floorBumps = fbm(noise3, x / 55 + 7, z / 55 + 3, 2) * 0.7;
      // 0 out at sea, 1 on land; land sits slightly above sea level, sea floor sinks below it
      const shore = smoothstep(cx - P.shelfWidth, cx + P.beachWidth, x);
      const landBase = lerp(-P.seaDepth, 2.0, shore) + floorBumps;
      // mountains only rise east of the beach
      const m = smoothstep(cx + P.beachWidth, cx + P.beachWidth + P.mountainFalloff, x);
      if (m <= 0) return landBase;
      const r = Math.pow(Math.max(ridged(x / P.scale, z / P.scale), 0), P.peakiness);
      const base = (fbm(noise2, x / P.baseScale, z / P.baseScale) * 0.5 + 0.5) * P.baseAmp;
      const range = 1 + P.rangeBias * clamp((x - cx) / (P.size * 0.5), 0, 1);
      return landBase + (r * P.amplitude * range + base) * m;
    },
  };
}

// ---------------------------------------------------------------- real terrain (Santiago)
// The dataset is a lat/lon grid: x spans its full width (Pacific -> Argentina) at unitsPerKm,
// z runs north (-z) to south. Past either edge the strip mirrors, so the flight is endless with no
// seam. Heights are metres * exaggeration; the sea stays at y = 0 like the procedural world.
const real = new ChileTerrain((tx, ty) => { if (H?.real) staleTile(tx, ty); });
const worldWidth = () => (P.terrain === 'chile' ? real.widthKm * P.unitsPerKm : P.size);
function makeRealHeightFn(P) {
  const upk = P.unitsPerKm;                    // world units per km
  const width = real.widthKm * upk, L = real.lengthKm * upk;
  const vs = (upk / 1000) * P.exaggeration;    // world units per metre of elevation
  // past either end of the country the strip mirrors, so the flight never meets a wall
  const zKm = (z) => { const t = (((z / L) % 2) + 2) % 2; return (t <= 1 ? t : 2 - t) * real.lengthKm; };
  return {
    real: true, upk, L, vs, width, zKm,
    kmX: (km) => km * upk,
    summitY: (ele) => P.landBase + ele * vs,
    // every world-space copy (strip + mirrors) of a km row within [zMin, zMax]
    zCopies(kmZ, zMin, zMax) {
      const v = kmZ / real.lengthKm, out = [];
      for (let n = Math.floor(zMin / (2 * L)) - 1; n <= Math.ceil(zMax / (2 * L)); n++) {
        for (const z of [2 * L * n + v * L, 2 * L * n - v * L]) if (z >= zMin && z <= zMax) out.push(z);
      }
      return out;
    },
    height(x, z) {
      const kz = zKm(z);
      // a lake is one plane at its surface level (SRTM is noisy over water; a lake cell the relief
      // has at sea level is a void, not sea, and comes up to the lake too)
      if (P.showWater) { const w = real.water(x / upk, kz); if (w && w.level > 0) return P.landBase + w.level * vs; }
      const m = real.sample(x / upk, kz);
      // sea cells go straight to the sea floor, under the animated plane; land starts above the
      // wave crests so beaches and river mouths never interleave with the water
      if (m <= 0) return -P.seaDepth;
      return P.landBase + m * vs;
    },
    /** is the 250 m cell under a world point a lake, reservoir or river bed */
    wet(x, z) { return P.showWater && real.water(x / upk, zKm(z)) !== null; },
    // roof height of whatever the city builder draws at (x, z), or -Infinity: the same inset block
    // of the mesh cell the point is in, and the footprint boxes of the named towers
    obstacle(x, z) {
      if (!P.showBuildings) return -Infinity;
      const { cell } = grid;
      let top = -Infinity;
      const i = Math.floor(x / cell), j = Math.floor(z / cell);
      const x0 = i * cell, z0 = j * cell, x1 = x0 + cell, z1 = z0 + cell;
      const b = real.built((x0 + x1) / 2 / upk, zKm((z0 + z1) / 2));
      if (b && b.fraction >= P.blockMin) {
        const side = Math.min(1, 0.3 + 0.7 * Math.sqrt(b.fraction)) * 0.9;
        const mx = (cell * (1 - side)) / 2;
        if (x >= x0 + mx && x <= x1 - mx && z >= z0 + mx && z <= z1 - mx) {
          const yb = Math.max(this.height(x0, z0), this.height(x1, z0), this.height(x0, z1), this.height(x1, z1));
          if (yb > 0) top = yb - 0.5 + Math.max(0.6, b.height * vs * P.blockScale);
        }
      }
      const kz = zKm(z);
      for (const l of real.landmarks) {
        const hw = (l.w * P.landmarkFootprint * upk) / 2000, hd = (l.d * P.landmarkFootprint * upk) / 2000;
        if (Math.abs(x - l.kmX * upk) > hw || Math.abs(kz - l.kmZ) * upk > hd) continue;
        top = Math.max(top, this.height(x, z) - 0.5 + l.h * vs * P.landmarkScale);
      }
      return top;
    },
  };
}
// terrain or roof, whichever is higher: what the bird must stay above
const groundAt = (x, z) => Math.max(H.height(x, z), H.obstacle ? H.obstacle(x, z) : -Infinity);
// z of the start latitude: where flights begin (Santiago by default)
const homeZ = () => (P.terrain === 'chile' ? real.latToKmZ(P.startLat) * P.unitsPerKm : 0);
// a tile arrived: every chunk overlapping it is rebuilt (nearest first, within the frame budget)
function staleTile(tx, ty) {
  const R = real.tileRect(tx, ty), { D } = grid, upk = H.upk;
  for (const key of chunks.keys()) {
    const [i, k] = key.split(',').map(Number);
    const x0 = (i * D) / upk, x1 = ((i + 1) * D) / upk, za = H.zKm(k * D), zb = H.zKm((k + 1) * D);
    if (x1 >= R.x0 && x0 <= R.x1 && Math.max(za, zb) >= R.z0 && Math.min(za, zb) <= R.z1) stale.add(key);
  }
}
// tiles around the camera and ahead of the flight; cheap, called every frame
function streamTiles() {
  if (!H?.real) return;
  // chunks are wanted a little past the view distance and need every tile under them, so the tile
  // radius reaches one and a half chunks further than the chunks do. While the screen is black on
  // the way to a teleport, the destination's tiles stream instead of the ones here
  const to = crash.to;
  real.update(to ? to.kmX : focus.x / H.upk, to ? to.kmZ : H.zKm(focus.z), -Math.sin(condor.yaw), -Math.cos(condor.yaw), (P.viewDistance + 1.5 * grid.D) / H.upk, P.prefetchKm);
}
// the wire vertex a named summit is pinned to (used by the chunk builder and the labels alike)
function peakVertex(p, z) {
  const { cell } = grid;
  const gi = Math.round(H.kmX(p.kmX) / cell), gj = Math.round(z / cell);
  const x = gi * cell, zs = gj * cell;
  return { gi, gj, x, z: zs, y: Math.max(H.height(x, zs), H.summitY(p.ele)) };
}

// ---------------------------------------------------------------- scene
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5) * P.renderScale);
renderer.setSize(innerWidth, innerHeight);
renderer.domElement.className = 'scene';
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.5, 5000);
camera.rotation.order = 'YXZ';

scene.fog = new THREE.FogExp2(new THREE.Color(P.fogColor), P.fogDensity);

const sunLight = new THREE.DirectionalLight(new THREE.Color(P.lightColor), P.lightIntensity);
scene.add(sunLight, sunLight.target);
const ambient = new THREE.HemisphereLight(0x666666, 0x000000, P.ambient);
scene.add(ambient);

// --- sky dome (gradient + stars + striped sun in one shader)
const skyUniforms = {
  uTop: { value: new THREE.Color(P.skyTop) },
  uHorizon: { value: new THREE.Color(P.skyHorizon) },
  uBottom: { value: new THREE.Color(P.skyBottom) },
  uSunTop: { value: new THREE.Color(P.sunTop) },
  uSunBottom: { value: new THREE.Color(P.sunBottom) },
  uSunDir: { value: new THREE.Vector3(0, 0.2, -1).normalize() },
  uSunSize: { value: P.sunSize },
  uStripes: { value: P.stripes },
  uStars: { value: P.stars },
  uGlow: { value: P.glow },
  uSunOn: { value: 0 },
  uTime: { value: 0 },
};
const skyMat = new THREE.ShaderMaterial({
  uniforms: skyUniforms,
  side: THREE.BackSide,
  depthWrite: false,
  fog: false,
  vertexShader: `
    varying vec3 vDir;
    void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: `
    precision highp float;
    varying vec3 vDir;
    uniform vec3 uTop, uHorizon, uBottom, uSunTop, uSunBottom, uSunDir;
    uniform float uSunSize, uStripes, uStars, uGlow, uSunOn, uTime;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    void main() {
      vec3 d = normalize(vDir);
      float h = d.y;
      vec3 col = mix(uHorizon, uTop, pow(clamp(h, 0.0, 1.0), 0.5));
      col = mix(uBottom, col, smoothstep(-0.25, 0.0, h));

      // stars
      float above = smoothstep(0.02, 0.25, h);
      if (above > 0.0) {
        vec2 uv = vec2(atan(d.z, d.x) * 40.0, h * 90.0);
        vec2 cell = floor(uv); vec2 f = fract(uv);
        float r = hash(cell);
        vec2 sp = vec2(hash(cell + 7.3), hash(cell + 19.1)) * 0.8 + 0.1;
        float dist = length(f - sp);
        float star = smoothstep(0.12, 0.0, dist) * step(1.0 - uStars, r);
        star *= 0.55 + 0.45 * sin(uTime * 1.5 + r * 100.0);
        col += star * above * 0.9;
      }

      // sun
      float ang = acos(clamp(dot(d, uSunDir), -1.0, 1.0));
      float elev = asin(clamp(h, -1.0, 1.0));
      float sunElev = asin(clamp(uSunDir.y, -1.0, 1.0));
      float sy = (elev - (sunElev - uSunSize)) / (2.0 * uSunSize);
      vec3 sunCol = mix(uSunBottom, uSunTop, clamp(sy, 0.0, 1.0));
      float disc = (1.0 - smoothstep(uSunSize * 0.985, uSunSize * 1.005, ang)) * uSunOn;
      float cutoff = 0.5;
      if (sy < cutoff) {
        float k = sy * uStripes;
        float gapW = mix(0.6, 0.05, sy / cutoff);
        disc *= 1.0 - step(fract(k), gapW);
      }
      float glow = exp(-(ang / max(uSunSize, 0.01)) * 1.5) * uSunOn;
      col += sunCol * glow * uGlow * 0.8 * (1.0 - disc);
      col = mix(col, sunCol * 1.05, disc);
      // warm horizon haze
      col += uSunBottom * 0.25 * uGlow * uSunOn * exp(-abs(h) * 12.0);
      gl_FragColor = vec4(col, 1.0);
    }
  `,
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(2500, 32, 16), skyMat);
sky.renderOrder = -1;
scene.add(sky);

// --- terrain group
const terrainGroup = new THREE.Group();
scene.add(terrainGroup);
let H = null;

// solid red faces under the wire, unlit: the shade is baked into the vertex colors per face
// (a lit material would crush the dark reds to black away from the low sun)
const terrainMat = new THREE.MeshBasicMaterial({
  vertexColors: true,
  polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
});
function sunDir() {
  const el = P.sunElevation, az = P.sunAzimuth;
  return new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).normalize();
}
// wire color lives in the vertex colors (red low, white snow high); the material color is a plain multiplier
const wireMat = new THREE.LineBasicMaterial({
  color: 0xffffff, vertexColors: true, transparent: true, opacity: P.wireOpacity,
  blending: THREE.AdditiveBlending, depthWrite: false,
});
// rivers: one colour, drawn like the wire (additive, no depth write) so they glow the same way
const riverMat = new THREE.LineBasicMaterial({
  color: new THREE.Color(P.seaWireColor), transparent: true, opacity: P.riverOpacity,
  blending: THREE.AdditiveBlending, depthWrite: false,
});

// --- sea: flat-shaded animated waves, displaced in the vertex shader (mesh + wire share the wave)
const seaWaveGLSL = `
  uniform float uTime, uAmp, uFreq;
  float wave(vec2 p) {
    return uAmp * (0.5 * sin(p.x * uFreq + uTime * 0.9)
                 + 0.3 * sin((p.x * 0.6 + p.y * 0.8) * uFreq * 1.7 - uTime * 1.3)
                 + 0.2 * sin(p.y * uFreq * 2.3 + uTime * 0.7));
  }
`;
const seaUniforms = {
  uTime: { value: 0 }, uAmp: { value: P.waveAmp }, uFreq: { value: P.waveFreq },
  uDeep: { value: new THREE.Color(P.seaDeep) }, uCrest: { value: new THREE.Color(P.seaCrest) },
  uLightDir: { value: new THREE.Vector3(0, 1, 0) }, uLightColor: { value: new THREE.Color(P.lightColor) },
  uWire: { value: new THREE.Color(P.seaWireColor) }, uWireOpacity: { value: P.seaWireOpacity },
};
const seaMat = new THREE.ShaderMaterial({
  uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, seaUniforms]),
  fog: true,
  polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
  vertexShader: `
    ${seaWaveGLSL}
    varying float vH; varying vec3 vWorldPos;
    #include <fog_pars_vertex>
    void main() {
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vH = wave(wp.xz); wp.y += vH; vWorldPos = wp.xyz;
      vec4 mvPosition = viewMatrix * wp;
      gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
    }
  `,
  fragmentShader: `
    uniform vec3 uDeep, uCrest, uLightDir, uLightColor; uniform float uAmp;
    varying float vH; varying vec3 vWorldPos;
    #include <fog_pars_fragment>
    void main() {
      vec3 n = normalize(cross(dFdx(vWorldPos), dFdy(vWorldPos)));
      if (n.y < 0.0) n = -n;
      float diff = max(dot(n, uLightDir), 0.0);
      float t = clamp(vH / max(uAmp, 0.001) * 0.5 + 0.5, 0.0, 1.0);
      vec3 col = mix(uDeep, uCrest, t) + uLightColor * diff * 0.3;
      gl_FragColor = vec4(col, 1.0);
      #include <fog_fragment>
    }
  `,
});
const seaWireMat = new THREE.ShaderMaterial({
  uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, seaUniforms]),
  fog: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  vertexShader: `
    ${seaWaveGLSL}
    #include <fog_pars_vertex>
    void main() {
      vec4 wp = modelMatrix * vec4(position, 1.0);
      wp.y += wave(wp.xz) + 0.05;
      vec4 mvPosition = viewMatrix * wp;
      gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
    }
  `,
  fragmentShader: `
    uniform vec3 uWire; uniform float uWireOpacity;
    #include <fog_pars_fragment>
    void main() {
      gl_FragColor = vec4(uWire, uWireOpacity);
      #include <fog_fragment>
    }
  `,
});
// both materials share the same uniform *objects* so one update hits both
for (const k in seaUniforms) { seaMat.uniforms[k] = seaUniforms[k]; seaWireMat.uniforms[k] = seaUniforms[k]; }

// the colour ramp's endpoints, parsed once per palette change rather than once per face
// (a chunk has thousands of faces; parsing hex strings for each was most of the build time)
let _pal = null, _palKey = '';
function palette() {
  const key = `${P.colorLow}|${P.colorMid}|${P.colorHigh}|${P.colorPeak}|${P.snowColor}|${P.snowFaceTone}|${P.wireColor}`;
  if (key !== _palKey) {
    _palKey = key;
    _pal = {
      low: new THREE.Color(P.colorLow), mid: new THREE.Color(P.colorMid), high: new THREE.Color(P.colorHigh), peak: new THREE.Color(P.colorPeak),
      snow: new THREE.Color(P.snowColor), snowFace: new THREE.Color(P.snowColor).multiplyScalar(P.snowFaceTone), wire: new THREE.Color(P.wireColor),
    };
  }
  return _pal;
}
// both return a shared scratch colour: read it before the next call
const _gc = new THREE.Color(), _wcol = new THREE.Color();
function gradientColor(t) {
  const p = palette(), c = _gc;
  const m = clamp(P.midPoint, 0.05, 0.9);
  const hi = m + (1 - m) * 0.6;
  if (t < m) c.lerpColors(p.low, p.mid, t / m);
  else if (t < hi) c.lerpColors(p.mid, p.high, (t - m) / (hi - m));
  else c.lerpColors(p.high, p.peak, (t - hi) / (1 - hi));
  // faces take a dimmer snow than the wire so the caps read as matte, not glare
  return c.lerp(p.snowFace, snowAmount(t) * 0.85);
}
// 0 below the snow line, 1 above it, smooth across the blend band
function snowAmount(t) { return smoothstep(P.snowLine - P.snowBlend, P.snowLine + P.snowBlend, t); }
function wireColorAt(t) { const p = palette(); return _wcol.copy(p.wire).lerp(p.snow, snowAmount(t)); }

// Streaming terrain: the world is infinite along z (the flight axis). It is split into
// chunks of `chunkDepth` units that are generated on demand around the camera from
// world-space noise, so neighbouring chunks share identical edge vertices (no seams).
const chunks = new Map();          // "i,k" -> { group, lod }
const stale = new Set();           // chunks built from a coarser data level than is now loaded
const buildTimes = [];             // [chunk key, ms] of recent builds, for the stats
const fading = [];                 // chunks fading in: { group, faces, lines, t }
// a chunk is only built once every tile under it is in (the sea needs none): nothing is ever
// built from the overview and rebuilt in view; at the fog line an absent chunk is invisible
function chunkTilesReady(i, k) {
  if (!H?.real) return true;
  const { D } = grid, upk = H.upk;
  return real.loaded(((i + 0.5) * D) / upk, H.zKm((k + 0.5) * D), (D * 0.71) / upk);
}
let lastPending = 0; // wanted chunks within the view distance not built yet (last updateChunks)
function refreshChunks() { for (const key of chunks.keys()) stale.add(key); }
const chunkGroup = new THREE.Group();
terrainGroup.add(chunkGroup);
// cell: fine vertex spacing; S: cells per chunk side; D: chunk side in units; G: half the width in cells
let grid = { cell: 1, S: 4, D: 4, G: 1, width: 1, cMin: 0, cMax: 1 };
let seaMesh = null, seaLines = null, seaCell = 1, seaLen = 0;

function disposeObject(o) {
  o.traverse((c) => { if (c.geometry) c.geometry.dispose(); });
}

function buildTerrain() {
  // reset everything
  for (const c of chunks.values()) disposeObject(c.group);
  chunks.clear();
  chunkGroup.clear();
  stale.clear();
  H = P.terrain === 'chile' ? makeRealHeightFn(P) : makeHeightFn(P);

  const width = worldWidth();
  const cell = Math.max(0.5, P.cellSize);
  const S = Math.max(4, Math.round(P.chunkSize / cell / 4) * 4); // multiple of 4 so every LOD divides it
  grid = {
    cell, S, D: S * cell, G: Math.floor(width / 2 / cell), width,
    cMin: -P.seaDepth,
    // real relief: the colour ramp is anchored so the snow line sits at a physical altitude
    cMax: H.real ? -P.seaDepth + (P.snowLineM * H.vs) / Math.max(P.snowLine, 0.05)
                 : (P.amplitude * (1 + P.rangeBias) * 0.7 + P.baseAmp) * P.colorScale + 2,
  };

  buildSea();
  if (!(H.real && !booted)) updateChunks(Infinity); // at boot, real chunks wait for the tiles (see below)
}
let booted = false, revealed = false;

// The world is a grid of square chunks (i along x, k along z). Vertices sit on the global fine
// lattice (gi * cell, gj * cell) so neighbouring chunks share bit-identical edges; a chunk built at
// LOD n uses every n-th lattice line. Returns null for a chunk entirely outside the terrain width.
function buildChunk(i, k, lod) {
  const { cell, S, G } = grid;
  const gi0 = Math.max(i * S, -G), gi1 = Math.min((i + 1) * S, G);
  if (gi1 <= gi0) return null;
  const gj0 = k * S;
  const gis = [];
  for (let g = gi0; g < gi1; g += lod) gis.push(g);
  gis.push(gi1); // the last column is the shared edge (narrower when the world edge clips the chunk)
  const w = gis.length, rows = S / lod + 1, nx = w - 1, segsZ = rows - 1;
  const pos = new Float32Array(w * rows * 3);
  for (let j = 0; j < rows; j++) {
    const z = (gj0 + j * lod) * cell;
    for (let ii = 0; ii < w; ii++) {
      const x = gis[ii] * cell;
      const o = (j * w + ii) * 3;
      pos[o] = x; pos[o + 1] = H.height(x, z); pos[o + 2] = z;
    }
  }
  if (H.real) {
    // named summits pin their nearest vertex to the true elevation: the downsampled grid never
    // averages a peak away, and each label sits exactly on a wire vertex
    for (const p of real.peaks) for (const z of H.zCopies(p.kmZ, (gj0 - lod / 2) * cell, (gj0 + S + lod / 2) * cell)) {
      const v = peakVertex(p, z);
      const ii = Math.round((v.gi - gi0) / lod), j = Math.round((v.gj - gj0) / lod);
      if (j < 0 || j >= rows || ii < 0 || ii >= w) continue;
      const o = (j * w + ii) * 3 + 1;
      pos[o] = Math.max(pos[o], v.y);
    }
  }
  const idx = (ii, j) => j * w + ii;
  // the sea floor is never seen: whatever lies entirely below the deepest wave trough is left out
  // (faces and wire), so there is no mesh under the water for it to show through
  const sunk = (v) => pos[v * 3 + 1] <= -P.waveAmp;
  // Route inland water into the sea's shared materials, including waves, light and fog.
  const water = H.real && H.wet && P.showWater;
  const waterFaces = [], waterLines = [];

  // wire grid (rows + columns, optional diagonals)
  const lp = [], lc = [];
  const range = Math.max(grid.cMax - grid.cMin, 1e-6);
  const tint = (v) => { const c = wireColorAt(clamp((pos[v * 3 + 1] - grid.cMin) / range, 0, 1)); lc.push(c.r, c.g, c.b); };
  const push = (a, b) => {
    if (sunk(a) && sunk(b)) return;
    const isWater = water && H.wet((pos[a * 3] + pos[b * 3]) / 2, (pos[a * 3 + 2] + pos[b * 3 + 2]) / 2);
    const out = isWater ? waterLines : lp;
    out.push(pos[a * 3], pos[a * 3 + 1], pos[a * 3 + 2], pos[b * 3], pos[b * 3 + 1], pos[b * 3 + 2]);
    if (!isWater) { tint(a); tint(b); }
  };
  for (let j = 0; j < rows; j++) for (let ii = 0; ii < w; ii++) {
    const a = idx(ii, j);
    if (ii < nx) push(a, idx(ii + 1, j));
    if (j < segsZ) push(a, idx(ii, j + 1));
    if (P.diagonals && ii < nx && j < segsZ) push(a, idx(ii + 1, j + 1));
  }
  // city blocks and landmark towers, merged into the same face and wire buffers (no extra draw calls)
  const city = H.real && P.showBuildings ? buildCity(gi0, gi1, gj0, S, lod, pos, w) : null;
  let linePos = lp, lineCol = lc;
  if (city) {
    linePos = new Float32Array(lp.length + city.lp.length); linePos.set(lp); linePos.set(city.lp, lp.length);
    lineCol = new Float32Array(lc.length + city.lc.length); lineCol.set(lc); lineCol.set(city.lc, lc.length);
  }
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePos, 3));
  lineGeo.setAttribute('color', new THREE.Float32BufferAttribute(lineCol, 3));

  // flat-shaded faces with per-face color (non-indexed)
  const tri = [];
  const pushFace = (a, b, c) => {
    if (sunk(a) && sunk(b) && sunk(c)) return;
    if (water && H.wet((pos[a * 3] + pos[b * 3] + pos[c * 3]) / 3, (pos[a * 3 + 2] + pos[b * 3 + 2] + pos[c * 3 + 2]) / 3)) {
      for (const v of [a, b, c]) waterFaces.push(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]);
    } else tri.push(a, b, c);
  };
  for (let j = 0; j < segsZ; j++) for (let ii = 0; ii < nx; ii++) {
    const a = idx(ii, j), b = idx(ii + 1, j), c = idx(ii, j + 1), d = idx(ii + 1, j + 1);
    pushFace(a, c, b);
    pushFace(b, c, d);
  }
  const indexed = new THREE.BufferGeometry();
  indexed.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  indexed.setIndex(tri);
  const flat = indexed.toNonIndexed();
  indexed.dispose();
  flat.computeVertexNormals();
  const fp = flat.attributes.position, fn = flat.attributes.normal;
  const colors = new Float32Array(fp.count * 3);
  const L = sunDir(), N = new THREE.Vector3();
  for (let f = 0; f < fp.count; f += 3) {
    const y = (fp.getY(f) + fp.getY(f + 1) + fp.getY(f + 2)) / 3;
    const c = gradientColor(clamp((y - grid.cMin) / range, 0, 1));
    // baked shade: faces toward the sun are full, faces away keep a floor so nothing goes black
    N.set(fn.getX(f), fn.getY(f), fn.getZ(f));
    c.multiplyScalar(P.faceShadeFloor + (1 - P.faceShadeFloor) * Math.max(0, N.dot(L)));
    for (let q = 0; q < 3; q++) { colors[(f + q) * 3] = c.r; colors[(f + q) * 3 + 1] = c.g; colors[(f + q) * 3 + 2] = c.b; }
  }
  flat.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  let faces = flat;
  if (city && city.fp.length) {
    const p2 = new Float32Array(fp.array.length + city.fp.length), c2 = new Float32Array(colors.length + city.fc.length);
    p2.set(fp.array); p2.set(city.fp, fp.array.length);
    c2.set(colors); c2.set(city.fc, colors.length);
    faces = new THREE.BufferGeometry();
    faces.setAttribute('position', new THREE.BufferAttribute(p2, 3));
    faces.setAttribute('color', new THREE.BufferAttribute(c2, 3));
    flat.dispose();
  }

  const g = new THREE.Group();
  g.add(new THREE.Mesh(faces, terrainMat));
  g.add(new THREE.LineSegments(lineGeo, wireMat));
  if (water) {
    if (waterFaces.length) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(waterFaces, 3));
      g.add(new THREE.Mesh(geo, seaMat));
    }
    if (waterLines.length) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(waterLines, 3));
      g.add(new THREE.LineSegments(geo, seaWireMat));
    }
    const rp = buildRivers(gi0, gi1, gj0, S, lod, pos, w, rows);
    if (rp.length) {
      const riverGeo = new THREE.BufferGeometry();
      riverGeo.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3));
      g.add(new THREE.LineSegments(riverGeo, riverMat));
    }
  }
  return g;
}

// ---------------------------------------------------------------- rivers
// The river pieces of the loaded tiles (km polylines) that cross this chunk, in every strip copy,
// draped on the chunk's own lattice (bilinear over its vertices, so the line follows the faces at
// this LOD) and lifted a little. Segments are cut at STEP so the drape follows the relief between
// two far-apart points; a sub-segment belongs to the chunk its midpoint is in, so chunks neither
// overlap nor leave gaps. Nothing is drawn where the lattice is under the sea.
function buildRivers(gi0, gi1, gj0, S, lod, pos, w, rows) {
  const { cell } = grid, upk = H.upk, L2 = 2 * H.L;
  const xA = gi0 * cell, xB = gi1 * cell, zA = gj0 * cell, zB = (gj0 + S) * cell;
  const STEP = cell * lod * 0.5, lift = P.riverLift, sea = -P.waveAmp;
  const out = [];
  const latticeY = (x, z) => {
    const fx = clamp((x / cell - gi0) / lod, 0, w - 1), fz = clamp((z / cell - gj0) / lod, 0, rows - 1);
    const i0 = Math.floor(fx), j0 = Math.floor(fz), i1 = Math.min(i0 + 1, w - 1), j1 = Math.min(j0 + 1, rows - 1);
    const tx = fx - i0, tz = fz - j0;
    const y = (ii, j) => pos[(j * w + ii) * 3 + 1];
    return (y(i0, j0) * (1 - tx) + y(i1, j0) * tx) * (1 - tz) + (y(i0, j1) * (1 - tx) + y(i1, j1) * tx) * tz;
  };
  for (const r of real.rivers) {
    if (r.x1 * upk < xA || r.x0 * upk > xB) continue;
    // strip copies: forward (z = kmZ * upk + 2Ln) and mirrored (z = 2Ln - kmZ * upk)
    for (let n = Math.floor(zA / L2) - 1; n <= Math.ceil(zB / L2); n++) {
      for (const sgn of [1, -1]) {
        const off = L2 * n;
        const rz0 = Math.min(sgn * r.z0 * upk, sgn * r.z1 * upk) + off, rz1 = Math.max(sgn * r.z0 * upk, sgn * r.z1 * upk) + off;
        if (rz1 < zA || rz0 > zB) continue;
        const p = r.pts;
        for (let s = 0; s + 3 < p.length; s += 2) {
          const ax = p[s] * upk, az = sgn * p[s + 1] * upk + off, bx = p[s + 2] * upk, bz = sgn * p[s + 3] * upk + off;
          if (Math.max(ax, bx) < xA || Math.min(ax, bx) > xB || Math.max(az, bz) < zA || Math.min(az, bz) > zB) continue;
          const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / STEP));
          let px = ax, pz = az;
          for (let k = 1; k <= steps; k++) {
            const t = k / steps, qx = ax + (bx - ax) * t, qz = az + (bz - az) * t;
            const mx = (px + qx) / 2, mz = (pz + qz) / 2;
            if (mx >= xA && mx < xB && mz >= zA && mz < zB) {
              const py = latticeY(px, pz), qy = latticeY(qx, qz);
              if (py > sea || qy > sea) out.push(px, Math.max(py, sea) + lift, pz, qx, Math.max(qy, sea) + lift, qz);
            }
            px = qx; pz = qz;
          }
        }
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------- city
// Prisms are written straight into preallocated typed arrays (a downtown chunk holds a couple of
// thousand of them; pushing floats one by one was the slowest thing in a chunk build).
// Each prism: 5 faces = 10 triangles = 90 floats (+ 90 colour floats), 8 edges = 48 floats (+ 48).
const PRISM_F = 90, PRISM_L = 48;
const _sun = new THREE.Vector3(), _fc = new THREE.Color(), _wc = new THREE.Color();
const _normals = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // x, z of each side's outward normal
function writePrism(out, x0, x1, z0, z1, yb, yt, inset, face, wire) {
  const { fp, fc, lp, lc } = out;
  let f = out.f, l = out.l;
  const ix = (x1 - x0) * inset, iz = (z1 - z0) * inset;
  const bx = [x0, x1, x1, x0], bz = [z0, z0, z1, z1];
  const tx = [x0 + ix, x1 - ix, x1 - ix, x0 + ix], tz = [z0 + iz, z0 + iz, z1 - iz, z1 - iz];
  const floor = P.faceShadeFloor;
  const vert = (x, y, z, shade) => { fp[f] = x; fp[f + 1] = y; fp[f + 2] = z; fc[f] = face.r * shade; fc[f + 1] = face.g * shade; fc[f + 2] = face.b * shade; f += 3; };
  const line = (x, y, z) => { lp[l] = x; lp[l + 1] = y; lp[l + 2] = z; lc[l] = wire.r; lc[l + 1] = wire.g; lc[l + 2] = wire.b; l += 3; };
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) & 3, n = _normals[i];
    const shade = floor + (1 - floor) * Math.max(0, n[0] * _sun.x + n[1] * _sun.z);
    // outward winding: (b_i, t_i, t_j), (b_i, t_j, b_j)
    vert(bx[i], yb, bz[i], shade); vert(tx[i], yt, tz[i], shade); vert(tx[j], yt, tz[j], shade);
    vert(bx[i], yb, bz[i], shade); vert(tx[j], yt, tz[j], shade); vert(bx[j], yb, bz[j], shade);
    line(bx[i], yb, bz[i]); line(tx[i], yt, tz[i]);
    line(tx[i], yt, tz[i]); line(tx[j], yt, tz[j]);
  }
  const top = floor + (1 - floor) * Math.max(0, _sun.y);
  vert(tx[0], yt, tz[0], top); vert(tx[3], yt, tz[3], top); vert(tx[2], yt, tz[2], top);
  vert(tx[0], yt, tz[0], top); vert(tx[2], yt, tz[2], top); vert(tx[1], yt, tz[1], top);
  out.f = f; out.l = l;
}
// world position of a landmark's roof (label anchor) for one z copy
function landmarkTop(l, z) {
  const x = H.kmX(l.kmX);
  return { x, z, y: H.height(x, z) - 0.5 + l.h * H.vs * P.landmarkScale };
}
function buildCity(gi0, gi1, gj0, S, lod, pos, w) {
  const { cell } = grid, upk = H.upk, step = cell * lod;
  _sun.copy(sunDir());
  const rows = S / lod + 1;
  // pass 1: collect the prisms (cheap), pass 2: write them into exact-size buffers
  const specs = [];
  const blockFace = _fc.set(P.blockColor).clone(), blockWire = _wc.set(P.blockWire).clone();
  for (let j = 0; j < rows - 1; j++) for (let ii = 0; ii < w - 1; ii++) {
    const o = (j * w + ii) * 3;
    const x0 = pos[o], x1 = pos[o + 3];
    const z0 = (gj0 + j * lod) * cell, z1 = z0 + step;
    const b = real.built((x0 + x1) / 2 / upk, H.zKm((z0 + z1) / 2));
    if (!b || b.fraction < P.blockMin) continue;
    const yb = Math.max(pos[o + 1], pos[o + 4], pos[o + w * 3 + 1], pos[o + w * 3 + 4]);
    if (yb <= 0) continue; // never in the sea
    const side = Math.min(1, 0.3 + 0.7 * Math.sqrt(b.fraction)) * 0.9; // built-up fraction shows as block size
    const mx = ((x1 - x0) * (1 - side)) / 2, mz = (step * (1 - side)) / 2;
    specs.push([x0 + mx, x1 - mx, z0 + mz, z1 - mz, yb - 0.5, yb + Math.max(0.6, b.height * H.vs * P.blockScale), 0, blockFace, blockWire]);
  }
  // named towers: one prism each, in the chunk that holds its centre; the tallest taper
  const lmFace = _fc.set(P.blockColor).clone().multiplyScalar(1.6), lmWire = _wc.set(P.landmarkWire).clone();
  const xa = gi0 * cell, xb = gi1 * cell, za = gj0 * cell, zb = (gj0 + S) * cell;
  for (const l of real.landmarks) {
    const x = H.kmX(l.kmX);
    if (x < xa || x >= xb) continue;
    for (const z of H.zCopies(l.kmZ, za, zb)) {
      if (z >= zb) continue;
      const hw = (l.w * P.landmarkFootprint * upk) / 2000, hd = (l.d * P.landmarkFootprint * upk) / 2000;
      const top = landmarkTop(l, z);
      specs.push([x - hw, x + hw, z - hd, z + hd, top.y - l.h * H.vs * P.landmarkScale, top.y, l.h >= 150 ? 0.22 : 0, lmFace, lmWire]);
    }
  }
  const n = specs.length;
  const out = { fp: new Float32Array(n * PRISM_F), fc: new Float32Array(n * PRISM_F), lp: new Float32Array(n * PRISM_L), lc: new Float32Array(n * PRISM_L), f: 0, l: 0 };
  for (const sp of specs) writePrism(out, sp[0], sp[1], sp[2], sp[3], sp[4], sp[5], sp[6], sp[7], sp[8]);
  return out;
}

// LOD for a chunk at distance d; `cur` (its current LOD) adds hysteresis so a chunk on the
// boundary does not flip back and forth as the camera wobbles
function lodFor(d, cur) {
  if (!P.lod) return 1;
  const lod = d < P.lodNear ? 1 : d < P.lodFar ? 2 : 4;
  if (cur && cur !== lod) {
    const edge = lod === 1 || cur === 1 ? P.lodNear : P.lodFar;
    if (Math.abs(d - edge) < edge * 0.15) return cur;
  }
  return lod;
}

// Keep the chunks within viewDistance around the camera (only backDistance behind it: whatever is
// behind is never on screen). Builds, LOD changes and stale refreshes are all served nearest first,
// spending at most `budgetMs` per call so the frame never hitches.
const _dir = new THREE.Vector3();
function updateChunks(budgetMs = 5, nearDist = 0) {
  const { D, G, cell } = grid;
  const ci = Math.floor(focus.x / D), ck = Math.floor(focus.z / D);
  const r = Math.ceil(P.viewDistance / D);
  const iMin = Math.floor(-G * cell / D), iMax = Math.ceil(G * cell / D) - 1;
  camera.getWorldDirection(_dir);
  const wanted = [];
  for (let k = ck - r; k <= ck + r; k++) for (let i = Math.max(iMin, ci - r); i <= Math.min(iMax, ci + r); i++) {
    const dx = (i + 0.5) * D - focus.x, dz = (k + 0.5) * D - focus.z;
    const d = Math.hypot(dx, dz);
    if (d > P.viewDistance + D * 0.7) continue;
    if (dx * _dir.x + dz * _dir.z < -P.backDistance - D * 0.7) continue;
    wanted.push({ key: i + ',' + k, i, k, d });
  }
  const keep = new Set(wanted.map((w) => w.key));
  for (const [key, c] of chunks) {
    if (!keep.has(key)) { disposeObject(c.group); chunkGroup.remove(c.group); chunks.delete(key); stale.delete(key); }
  }
  wanted.sort((a, b) => a.d - b.d);
  const t0 = performance.now();
  let built = 0, pendingNear = 0;
  for (const w of wanted) {
    const ex = chunks.get(w.key);
    const lod = lodFor(w.d, ex?.lod);
    if (ex && ex.lod === lod && !stale.has(w.key)) continue;
    if (!chunkTilesReady(w.i, w.k)) { if (w.d <= nearDist) pendingNear++; continue; }
    if (built > 0 && performance.now() - t0 > budgetMs) { if (w.d <= nearDist) pendingNear++; continue; }
    if (ex) { disposeObject(ex.group); chunkGroup.remove(ex.group); chunks.delete(w.key); }
    stale.delete(w.key);
    const tb = performance.now();
    const group = buildChunk(w.i, w.k, lod);
    buildTimes.push([w.key, Math.round(performance.now() - tb)]);
    if (buildTimes.length > 400) buildTimes.shift();
    if (!group) continue;
    chunks.set(w.key, { group, lod });
    chunkGroup.add(group);
    if (revealed && !ex && P.chunkFade > 0) startFade(group);
    built++;
  }
  return pendingNear;
}
// a chunk added while the scene is visible materialises over chunkFade seconds (it sits at the
// fog line, so this is the difference between a faint pop and nothing at all)
function startFade(group) {
  const faces = group.children[0], lines = group.children[1];
  faces.material = terrainMat.clone(); faces.material.transparent = true; faces.material.opacity = 0;
  lines.material = wireMat.clone(); lines.material.opacity = 0;
  fading.push({ group, faces, lines, t: 0 });
}
function updateFades(dt) {
  for (let i = fading.length - 1; i >= 0; i--) {
    const f = fading[i];
    f.t = Math.min(1, f.t + dt / P.chunkFade);
    if (!f.group.parent) { f.faces.material.dispose(); f.lines.material.dispose(); fading.splice(i, 1); continue; }
    f.faces.material.opacity = f.t;
    f.lines.material.opacity = wireMat.opacity * f.t;
    if (f.t >= 1) {
      f.faces.material.dispose(); f.lines.material.dispose();
      f.faces.material = terrainMat; f.lines.material = wireMat;
      fading.splice(i, 1);
    }
  }
}

function buildSea() {
  if (seaMesh) { disposeObject(seaMesh); disposeObject(seaLines); terrainGroup.remove(seaMesh, seaLines); }
  // one flat plane at y = 0 that follows the camera along z (snapped to its own cell size, so
  // the wire grid never slides); waves are computed in world space so motion stays continuous
  const sn = Math.round(P.seaResolution);
  seaCell = grid.width / sn;
  const len = (Math.ceil(seaLenFor(P.viewDistance) / seaCell)) * seaCell;
  const sz = Math.round(len / seaCell), sw = sn + 1;
  seaLen = len;
  const sg = new THREE.PlaneGeometry(grid.width, len, sn, sz);
  sg.rotateX(-Math.PI / 2);
  seaMesh = new THREE.Mesh(sg, seaMat);
  const sp = sg.attributes.position, slp = [];
  const sidx = (i, j) => j * sw + i;
  const spush = (a, b) => { slp.push(sp.getX(a), 0, sp.getZ(a), sp.getX(b), 0, sp.getZ(b)); };
  for (let j = 0; j <= sz; j++) for (let i = 0; i < sw; i++) {
    const a = sidx(i, j);
    if (i < sn) spush(a, sidx(i + 1, j));
    if (j < sz) spush(a, sidx(i, j + 1));
  }
  const slg = new THREE.BufferGeometry();
  slg.setAttribute('position', new THREE.Float32BufferAttribute(slp, 3));
  seaLines = new THREE.LineSegments(slg, seaWireMat);
  terrainGroup.add(seaMesh, seaLines);
  updateSea();
}
// the plane must reach past every chunk kept around the camera (updateChunks keeps them to
// viewDistance + 0.7 D), so the water never ends inside the built terrain
function seaLenFor(viewDistance) { return viewDistance * 2 + grid.D * 2; }
function updateSea() {
  if (!seaMesh) return;
  // a higher quality tier (or the slider) grows the view distance after the plane was built:
  // without this the far chunks reached past the water's end and showed bare sea bed
  if (seaLenFor(P.viewDistance) > seaLen) return buildSea();
  const z = Math.round(focus.z / seaCell) * seaCell;
  seaMesh.position.z = z;
  seaLines.position.z = z;
}

// ---------------------------------------------------------------- post
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), P.bloomStrength, P.bloomRadius, P.bloomThreshold);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());

const TONE = { None: THREE.NoToneMapping, ACES: THREE.ACESFilmicToneMapping, Reinhard: THREE.ReinhardToneMapping, Cineon: THREE.CineonToneMapping, Neutral: THREE.NeutralToneMapping };

function applyAtmosphere() {
  scene.fog.color.set(P.fogColor);
  scene.fog.density = P.fogDensity;
  sunLight.color.set(P.lightColor);
  sunLight.intensity = P.lightIntensity;
  ambient.intensity = P.ambient;
  renderer.toneMapping = TONE[P.toneMapping];
  renderer.toneMappingExposure = P.exposure;
  bloomPass.enabled = P.bloom;
  bloomPass.strength = P.bloomStrength;
  bloomPass.radius = P.bloomRadius;
  bloomPass.threshold = P.bloomThreshold;
  document.getElementById('scan').classList.toggle('hidden', !P.scanlines);
  const pr = Math.min(devicePixelRatio, quality.dprCap) * P.renderScale;
  if (renderer.getPixelRatio() !== pr) { renderer.setPixelRatio(pr); composer.setPixelRatio(pr); composer.setSize(innerWidth, innerHeight); }
  wireMat.opacity = P.wireOpacity;
  riverMat.color.set(P.seaWireColor);
  riverMat.opacity = P.riverOpacity;
  seaUniforms.uAmp.value = P.waveAmp;
  seaUniforms.uFreq.value = P.waveFreq;
  seaUniforms.uDeep.value.set(P.seaDeep);
  seaUniforms.uCrest.value.set(P.seaCrest);
  seaUniforms.uWire.value.set(P.seaWireColor);
  seaUniforms.uWireOpacity.value = P.seaWireOpacity;
  seaUniforms.uLightColor.value.set(P.lightColor);
}
function applySky() {
  const u = skyUniforms;
  u.uTop.value.set(P.skyTop); u.uHorizon.value.set(P.skyHorizon); u.uBottom.value.set(P.skyBottom);
  u.uSunTop.value.set(P.sunTop); u.uSunBottom.value.set(P.sunBottom);
  u.uSunSize.value = P.sunSize; u.uStripes.value = P.stripes; u.uStars.value = P.stars; u.uGlow.value = P.glow;
  u.uSunOn.value = P.showSun ? 1 : 0;
  const el = P.sunElevation, az = P.sunAzimuth;
  u.uSunDir.value.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).normalize();
  sunLight.position.copy(u.uSunDir.value).multiplyScalar(800);
  seaUniforms.uLightDir.value.copy(u.uSunDir.value);
  sunLight.target.position.set(0, 0, 0);
}

// ---------------------------------------------------------------- quality
// Cost per chunk (400 units, 8-unit cells): 5k triangles, 10k line vertices, ~0.6 MB of buffers.
// Chunks grow with the square of the view distance: 55 at 2000 units, 108 at 2800, 178 at 3600.
// Fill cost is the bloom (about six passes) and scales with pixels, hence the pixel-ratio cap.
const QUALITY = [
  { name: 'low',    viewDistance: 1400, dprCap: 1.0, bloom: false }, // ~27 chunks, 0.14 M tris
  { name: 'medium', viewDistance: 2000, dprCap: 1.5, bloom: true },  // ~55 chunks, 0.28 M tris
  { name: 'high',   viewDistance: 2800, dprCap: 1.5, bloom: true },  // ~108 chunks, 0.54 M tris
  { name: 'ultra',  viewDistance: 3600, dprCap: 2.0, bloom: true },  // ~178 chunks, 0.9 M tris, ~100 MB
];
const quality = { tier: 1, target: 1, gpu: '', dprCap: 1.5, dprLimit: 2, fogTarget: P.fogDensity, pendingView: null, pendingFog: null, displayMs: 16.7, frames: [], lastChange: 0, since: 0, locked: false, verdict: '' };
// The guess. GPU class from the renderer string when the browser shows one, else a fill-rate
// probe (Brave with shields, Firefox resisting fingerprinting and Safari all mask the string).
// Each class has a rough fill budget: the bloom is about six passes, so a frame costs ~3.2 x
// the canvas pixels, and the budget is what fits at 60 fps. Classes and budgets follow 3DMark
// Wild Life Extreme, with the M1 Pro (16 cores) as 1.0: discrete and M-series Pro/Max 0.7+ are
// ultra at 30 Mpx; the M-series base, Radeon 7x0M, Arc iGPUs and the fastest phones at ~0.45
// high at 16; Iris Xe (0.27), Vega 8 (0.13) and UHD 620 (0.07) medium at 8; below 0.05 (a
// mid-range phone, a software renderer) low at 4 or less. Phones and tablets are capped
// anyway. Too many pixels lowers the pixel-ratio cap first (cheaper than losing distance), then
// the tier. Cores and memory nudge, only when the browser is honest about them.
// What earlier visits learnt, in localStorage for 90 days: the probe's rate and, once the frame times
// confirmed or lowered a tier, that tier. Each against the renderer string, so a new GPU measures again.
const remembered = (() => {
  const out = {};
  for (const k of ['probe', 'tier']) {
    try { const v = JSON.parse(localStorage.getItem(`condor.quality.${k}`)); if (v && Date.now() - v.at < 90 * 864e5) out[k] = v; } catch {}
  }
  return out;
})();
function remember(k, v) {
  try { localStorage.setItem(`condor.quality.${k}`, JSON.stringify({ ...v, at: Date.now() })); } catch {}
  return v;
}
const PROBE_REF = 14000; // Mpx/s of probeFill's shader on an M1 Pro (16 cores; Chromium on Metal measures 14,000–14,600): the 1.0 of the scale above
function guessTier() {
  const gl = renderer.getContext();
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const gpu = String((ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)) || '');
  const mobile = navigator.userAgentData?.mobile || /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && innerWidth < 1100);
  const touchOnly = navigator.maxTouchPoints > 1 && matchMedia('(hover: none)').matches; // a tablet in landscape: throttles, so high at most
  let t = 1, mpxBudget = 8, named = true, verdict = gpu.replace(/^ANGLE \((.*)\)$/, '$1').slice(0, 48);
  if (/swiftshader|llvmpipe|softpipe|software/i.test(gpu)) { t = 0; mpxBudget = 1; }
  else if (/apple m\d/i.test(gpu)) { t = /m\d+ (pro|max|ultra)/i.test(gpu) ? 3 : 2; mpxBudget = /m\d+ (pro|max|ultra)/i.test(gpu) ? 30 : 16; }
  else if (/radeon (rx )?vega|radeon graphics|radeon \d{3}m\b|\bvega\b|geforce mx|\barc(?:\(tm\))?(?![a-z(])(?! [ab]\d{3})|iris(?:\(r\))? xe/i.test(gpu)) { // integrated (not the Arc A/B cards): Vega and Iris Xe medium, the rest high
    const mid = /vega|iris(?:\(r\))? xe/i.test(gpu); t = mid ? 1 : 2; mpxBudget = mid ? 8 : 16;
  }
  else if (/nvidia|geforce|rtx|gtx|radeon|amd|arc(?:\(tm\))? [ab]\d{3}/i.test(gpu)) { t = 3; mpxBudget = 30; }
  else if (/adreno [78]\d\d|immortalis|mali-g[67]1\d|mali-g7[68]|apple a1[5-9]|apple a[2-9]\d/i.test(gpu)) { t = 1; mpxBudget = 4; } // the phones that keep up with an Iris Xe
  else if (/mali|adreno|powervr|apple a\d|xclipse/i.test(gpu)) { t = 0; mpxBudget = 4; }
  else if (/intel|iris|uhd/i.test(gpu)) { t = 1; mpxBudget = 8; }
  else { // masked ("WebKit WebGL", "Apple GPU", "Mozilla"...): measure
    named = false;
    const ratio = (remembered.probe?.gpu === gpu ? remembered.probe.rate : remember('probe', { gpu, rate: probeFill() }).rate) / PROBE_REF;
    mpxBudget = clamp(30 * ratio ** 0.63, 1, 30); // 0.7 → 24, 0.35 → 15, 0.07 → 5.6, 0.01 → 1.7
    t = ratio >= 0.7 ? 3 : ratio >= 0.35 ? 2 : ratio >= 0.05 ? 1 : 0;
    verdict = `${verdict || 'unnamed gpu'} · probe ${(ratio * 100).toFixed(0)}% of M1 Pro`;
  }
  const px = innerWidth * innerHeight * devicePixelRatio ** 2;
  if (remembered.tier?.gpu === gpu && remembered.tier.tier < t && px >= remembered.tier.px * 0.8) { t = remembered.tier.tier; verdict += ' · remembered'; } // an earlier visit on this screen (or a smaller one) stepped down
  if (mobile) { t = Math.min(t, 1); mpxBudget = Math.min(mpxBudget, 4); }
  else if (touchOnly) { t = Math.min(t, 2); mpxBudget = Math.min(mpxBudget, 12); }
  if (named) { // a browser that hides the GPU fakes these too (Brave draws the core count at random)
    if ((navigator.hardwareConcurrency || 8) <= 4) t = Math.max(0, t - 1);
    if (navigator.deviceMemory && navigator.deviceMemory <= 4) t = Math.max(0, t - 1);
  }
  // fill: find the largest pixel-ratio cap whose frame fits the budget, dropping the tier if even 1x does not
  let dprLimit = 2;
  const mpx = (cap) => (innerWidth * innerHeight * Math.min(devicePixelRatio, cap) ** 2 * 3.2) / 1e6;
  while (dprLimit > 1 && mpx(dprLimit) > mpxBudget) dprLimit -= 0.25;
  if (mpx(1) > mpxBudget * 1.3) t = Math.max(0, t - 1);
  quality.gpu = gpu;
  quality.dprLimit = dprLimit;
  quality.verdict = `${verdict} · ${mpx(dprLimit).toFixed(0)} Mpx/frame`;
  return t;
}
// Fill-rate probe: a full-screen quad with a fragment shader shaped like the bloom's (eight
// texture taps and a short chain of multiply-adds), drawn into an offscreen target and read back
// (the one-pixel readback waits for the GPU). The batches grow, 256² to 2048² and then more
// passes, until one takes over 8 ms, so a weak device stops early and a strong one measures a
// 2048² batch of many passes: some tens of ms either way. Runs once per browser: the result is
// remembered in localStorage against the renderer string. Returns Mpx/s.
function probeFill() {
  const noise = new Uint8Array(64 * 64 * 4);
  for (let i = 0; i < noise.length; i++) noise[i] = (i * 2654435761) >>> 24;
  const tex = new THREE.DataTexture(noise, 64, 64, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.magFilter = tex.minFilter = THREE.LinearFilter; tex.needsUpdate = true;
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTex: { value: tex }, uSeed: { value: 0 } },
    vertexShader: 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: 'uniform sampler2D uTex; uniform float uSeed; void main() { vec2 p = gl_FragCoord.xy * (1.0 / 256.0); vec4 c = vec4(0.0); for (int i = 0; i < 8; i++) { float f = float(i) - 3.5; c += texture2D(uTex, p + vec2(f, -f) * (0.004 + uSeed * 0.0001)); } float a = c.x * 0.125; for (int i = 0; i < 16; i++) a = a * (1.02 - a) * 3.7 + uSeed * 0.001; gl_FragColor = vec4(a, c.y * 0.125, c.z * 0.125, 1.0); }',
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat), sc = new THREE.Scene().add(quad), cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const px = new Uint8Array(4);
  let rate = 0, rt = null;
  for (const [size, passes] of [[256, 8], [512, 8], [1024, 8], [2048, 8], [2048, 16], [2048, 32], [2048, 64]]) {
    if (!rt || rt.width !== size) { rt?.dispose(); rt = new THREE.WebGLRenderTarget(size, size, { depthBuffer: false }); }
    const draw = (seed) => { mat.uniforms.uSeed.value = seed; renderer.setRenderTarget(rt); renderer.render(sc, cam); };
    const sync = () => renderer.readRenderTargetPixels(rt, 0, 0, 1, 1, px); // ~1 ms round trip, so once per batch
    draw(0); sync(); // warm-up: the shader compile at the first size, the allocation at the others
    const times = []; // best of three batches, and more while the two best disagree: the first Metal command
    while (times.length < 6) { // buffers, the GPU clock ramp and a busy neighbour tab all stall at random
      const t0 = performance.now();
      for (let i = 1; i <= passes; i++) draw(i + times.length * passes);
      sync();
      times.push(performance.now() - t0);
      if (times.length >= 3 && [...times].sort((a, b) => a - b)[1] < Math.min(...times) * 1.3) break;
    }
    const best = Math.min(...times);
    rate = Math.max(rate, (size * size * passes) / (best * 1e3)); // short batches are sync-bound, so the longest wins
    if (best >= 8) break;
  }
  rt.dispose();
  renderer.setRenderTarget(null); mat.dispose(); quad.geometry.dispose(); tex.dispose();
  return rate;
}
// Apply a tier. Going up, the view distance grows at once (new chunks appear inside the fog) and
// the fog thins over a second. Going down, the fog thickens first and the far chunks are evicted
// only once they are hidden. The pixel ratio changes at once (a resolution step, kept rare).
function setTier(t, immediate = false) {
  t = clamp(Math.round(t), 0, QUALITY.length - 1);
  const q = QUALITY[t];
  quality.tier = t;
  quality.dprCap = Math.min(q.dprCap, quality.dprLimit);
  P.bloom = q.bloom;
  const fog = P.fogAuto ? 2.5 / q.viewDistance : P.fogDensity;
  if (immediate || q.viewDistance >= P.viewDistance) {
    P.viewDistance = q.viewDistance; quality.pendingView = null;
    // going up: the new ring is built under the thick fog first, then the fog thins (see adaptQuality)
    if (immediate) { P.fogDensity = fog; quality.fogTarget = fog; quality.pendingFog = null; }
    else { quality.pendingFog = fog; quality.fogTarget = P.fogDensity; lastPending = Infinity; } // unknown until the next chunk pass
  } else { quality.pendingView = q.viewDistance; quality.fogTarget = fog; quality.pendingFog = null; }
  quality.lastChange = performance.now();
  quality.since = performance.now();
  applyAtmosphere();
  refreshGui();
}
// per frame: ease the fog, apply a pending view distance once the fog hides the edge, and in
// auto mode confirm the tier once: 3 to 8 s after the ramp, frame times clearly over the display's
// budget step it down one tier (fog first, so it is not seen); either way it then locks for good
function adaptQuality(dt, rendered) {
  if (quality.pendingFog !== null && lastPending === 0) { quality.fogTarget = quality.pendingFog; quality.pendingFog = null; }
  if (Math.abs(P.fogDensity - quality.fogTarget) > 1e-7) {
    P.fogDensity += (quality.fogTarget - P.fogDensity) * Math.min(1, dt * 1.5);
    if (Math.abs(P.fogDensity - quality.fogTarget) < quality.fogTarget * 0.02) P.fogDensity = quality.fogTarget;
    scene.fog.density = P.fogDensity;
  } else if (quality.pendingView !== null) { P.viewDistance = quality.pendingView; quality.pendingView = null; refreshGui(); }
  if (P.quality !== 'auto' || !rendered || quality.locked || quality.tier !== quality.target || quality.pendingFog !== null) return;
  const now = performance.now();
  const budget = mode === 'game' ? quality.displayMs : Math.max(quality.displayMs, 1000 / P.ambientFps);
  quality.frames.push([now, dt * 1000]);
  while (quality.frames.length && now - quality.frames[0][0] > 3000) quality.frames.shift();
  const settled = now - quality.since;
  if (settled < 3000 || quality.frames.length < 8) return; // let the ramp and the shader warm-up pass (a slow device has few frames per window)
  const ms = quality.frames.map((f) => f[1]);
  const avg = ms.reduce((a, b) => a + b, 0) / ms.length;
  const slow = ms.filter((m) => m > budget * 1.6).length / ms.length;
  if ((avg > budget * 1.4 || slow > 0.3) && quality.tier > 0) {
    quality.verdict += ` · ${avg.toFixed(1)} ms vs ${budget.toFixed(1)}: stepped down`;
    quality.target = quality.tier - 1;
    setTier(quality.target);
    quality.locked = true;
    remember('tier', { gpu: quality.gpu, tier: quality.tier, px: innerWidth * innerHeight * devicePixelRatio ** 2 });
  } else if (settled > 8000) {
    quality.verdict += ` · ${avg.toFixed(1)} ms vs ${budget.toFixed(1)}: confirmed`;
    quality.locked = true;
    remember('tier', { gpu: quality.gpu, tier: quality.tier, px: innerWidth * innerHeight * devicePixelRatio ** 2 });
  }
}
// the display's frame interval: the shortest steady rAF delta seen early on (60 / 75 / 120 Hz...)
(function measureDisplay() {
  let last = 0, best = 1000, n = 0;
  const tick = (t) => { if (last) best = Math.min(best, t - last); last = t; if (++n < 40) requestAnimationFrame(tick); else quality.displayMs = Math.max(6, Math.min(best, 33.4)); };
  requestAnimationFrame(tick);
})();

// ---------------------------------------------------------------- condor (low-poly, built from triangles)
const condor = {
  group: new THREE.Group(), pos: new THREE.Vector3(), yaw: 0, pitch: 0, roll: 0, speed: 0,
  wingL: null, wingR: null, mats: [], edges: [],
};
condor.group.rotation.order = 'YXZ';
scene.add(condor.group);
const focus = new THREE.Vector3(); // where the terrain streams around

function buildCondor() {
  const g = condor.group;
  for (const c of [...g.children]) { c.traverse((o) => o.geometry?.dispose()); g.remove(c); }
  condor.mats.forEach((m) => m.dispose()); condor.edges.forEach((m) => m.dispose());
  condor.mats = []; condor.edges = [];
  const built = makeCondorMesh(condor.mats, condor.edges);
  condor.wingR = built.wingR; condor.wingL = built.wingL;
  g.add(...built.parts);
  g.scale.setScalar(P.condorScale);
  g.visible = P.showCondor;
}
// The condor's parts (body, right wing, left wing) from the current P colours; materials are
// pushed onto `mats` and `edges` so the caller owns their disposal. Shared with the flock
// (app/frontend/flock/render.ts), which builds one per remote pilot.
function makeCondorMesh(mats, edges) {
  const edgeMat = new THREE.LineBasicMaterial({ color: new THREE.Color(P.condorEdge), transparent: true, opacity: P.condorEdgeOpacity });
  edges.push(edgeMat);
  const col = { body: P.condorBody, ruff: P.condorRuff, head: P.condorHead, patch: P.condorPatch, beak: '#8a8a8a' };

  // triangle-soup builder: one mesh per color so each part can glow a little (self-lit),
  // which keeps the bird readable against the dark scene
  function builder() {
    const buckets = {};
    const tri = (a, b, c, k) => { (buckets[k] ??= []).push(...a, ...b, ...c); };
    const quad = (a, b, c, d, k) => { tri(a, b, c, k); tri(a, c, d, k); };
    const mesh = () => {
      const root = new THREE.Group();
      for (const k in buckets) {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(buckets[k], 3));
        geo.computeVertexNormals();
        const c = new THREE.Color(k);
        const m = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: P.condorGlow, flatShading: true, roughness: 0.9, side: THREE.DoubleSide });
        mats.push(m);
        const mesh = new THREE.Mesh(geo, m);
        mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 25), edgeMat));
        root.add(mesh);
      }
      return root;
    };
    return { tri, quad, mesh };
  }

  // body: lofted diamond cross-sections along z (forward = -z)
  const B = builder();
  const sections = [
    { z: -4.0, r: 0.04, c: col.beak }, { z: -3.5, r: 0.28, c: col.beak }, { z: -3.1, r: 0.36, c: col.head },
    { z: -2.55, r: 0.28, c: col.head }, { z: -2.15, r: 0.72, c: col.ruff }, { z: -1.45, r: 0.9, c: col.ruff },
    { z: -0.5, r: 0.85, c: col.body }, { z: 0.9, r: 0.62, c: col.body }, { z: 2.4, r: 0.3, c: col.body }, { z: 3.1, r: 0.06, c: col.body },
  ];
  const ring = (sct) => [[0, sct.r * 0.95, sct.z], [sct.r, 0.05, sct.z], [0, -sct.r, sct.z], [-sct.r, 0.05, sct.z]];
  for (let i = 0; i < sections.length - 1; i++) {
    const a = ring(sections[i]), b = ring(sections[i + 1]);
    const k = sections[i + 1].c === col.ruff ? col.ruff : sections[i].c;
    for (let j = 0; j < 4; j++) B.quad(a[j], b[j], b[(j + 1) % 4], a[(j + 1) % 4], k);
  }
  // tail fan
  const tc = [0.0, 0.0, 2.2], tips = [[-1.9, 0, 4.2], [-0.7, 0, 4.7], [0.7, 0, 4.7], [1.9, 0, 4.2]];
  B.tri([-0.5, 0, 2.5], tips[0], tips[1], col.body);
  B.tri([-0.5, 0, 2.5], tips[1], [0.5, 0, 2.5], col.body);
  B.tri([0.5, 0, 2.5], tips[1], tips[2], col.body);
  B.tri([0.5, 0, 2.5], tips[2], tips[3], col.body);
  B.tri(tc, [-0.5, 0, 2.5], [0.5, 0, 2.5], col.body);
  const body = B.mesh();

  // wing (right side; the left is the same geometry mirrored). Ribs: [lead, trail] points.
  const W = builder();
  const rib = (x, y, zl, zt) => ({ x, y, zl, zt, p: (t) => [x, y, zl + (zt - zl) * t] });
  const ribs = [rib(0, 0.25, -1.0, 1.15), rib(2.4, 0.5, -0.85, 1.05), rib(4.7, 0.65, -0.55, 0.8), rib(6.3, 0.6, -0.2, 0.6)];
  for (let i = 0; i < ribs.length - 1; i++) {
    const a = ribs[i], b = ribs[i + 1];
    const splitT = i === 0 ? 0.55 : 0.4; // white upper-wing patch on the trailing part of the outer wing
    W.quad(a.p(0), b.p(0), b.p(splitT), a.p(splitT), col.body);
    W.quad(a.p(splitT), b.p(splitT), b.p(1), a.p(1), i === 0 ? col.body : col.patch);
  }
  // primary "finger" feathers fanning from the last rib
  const last = ribs[ribs.length - 1];
  const fingerTips = [[9.0, 0.45, -1.6], [9.5, 0.45, -0.5], [9.4, 0.45, 0.6], [8.9, 0.45, 1.6], [8.1, 0.45, 2.4]];
  fingerTips.forEach((tip, i) => {
    const t0 = i * 0.2, t1 = t0 + 0.17;
    W.tri(last.p(t0), tip, last.p(t1), col.body);
  });
  const wingR = W.mesh();
  wingR.position.x = 0.75;
  const wingL = W.mesh();
  wingL.position.x = -0.75;
  wingL.scale.x = -1;
  return { parts: [body, wingR, wingL], wingR, wingL };
}

// ---------------------------------------------------------------- camera / controls
const cam = { yaw: 0, pitch: -0.06 };        // free camera
const orbit = { yaw: 0, pitch: 0 };           // chase-camera drag offset
function resetCamera(z = homeZ()) {
  // z is the infinite (along-coast) axis: a respawn keeps it, a manual reset goes back to 0
  let x = H?.real ? (mode === 'game' ? P.startKm : P.laneKm) * H.upk
                  : (H ? H.coastX(z) : P.coastOffset) + (mode === 'game' ? P.startOffset : P.ambientOffset);
  condor.yaw = H?.real && mode === 'game' ? -P.startHeading * Math.PI / 180 : 0;
  let altitude = mode === 'game' ? P.startAltitude : P.ambientAltitude;
  // game starts scatter around the tuned one (landing/spawn.ts), each still aimed at the city
  if (H?.real && mode === 'game') {
    const s = scatterSpawn({ x, y: altitude, z, yaw: condor.yaw }, { side: P.spawnSide, along: P.spawnAlong, altitude: P.spawnAltitude, aimKm: P.startAimKm, upk: H.upk });
    x = s.x; z = s.z; altitude = s.y; condor.yaw = s.yaw;
  }
  placeAt(x, z, altitude);
  cam.yaw = -0.45; cam.pitch = -0.12;
}
// the bird at (x, z), level, on its current heading, never inside the relief or a building: clear
// the ground under it and along its first stretch (a respawn after a crash keeps the crash's z,
// which may be a mountainside; a teleport lands on whatever the overview says is there)
function placeAt(x, z, altitude) {
  condor.pitch = 0; condor.roll = 0;
  let y = altitude;
  if (H) {
    let floor = -Infinity;
    for (let k = 0; k <= 12; k++) { const d = k * 30; floor = Math.max(floor, groundAt(x - Math.sin(condor.yaw) * d, z - Math.cos(condor.yaw) * d)); }
    y = Math.max(y, floor + P.crashMargin + P.respawnClearance);
  }
  condor.pos.set(x, y, z);
  orbit.yaw = 0; orbit.pitch = 0;
  camera.position.set(x + Math.sin(condor.yaw) * P.camDistance, y + P.camHeight, z + Math.cos(condor.yaw) * P.camDistance);
}
const keys = {};
addEventListener('keydown', (e) => {
  if (isTyping()) return;
  if (mode !== 'game') { if (e.code === 'KeyF') setMode('game'); return; } // ambient: never capture keys
  keys[e.code] = true;
  if (e.code === 'Escape') setMode('ambient');
  if (e.code === 'KeyH') gui.show(gui._hidden);
  if (e.code === 'KeyR') resetCamera(homeZ());
  if (e.code === 'KeyV') { P.cameraMode = P.cameraMode === 'condor' ? 'free' : 'condor'; onModeChange(); refreshGui(); }
  if (e.code === 'Space') e.preventDefault();
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
const isTyping = () => { const t = document.activeElement?.tagName; return t === 'INPUT' || t === 'TEXTAREA'; };
function onModeChange() {
  if (P.cameraMode === 'free') { cam.yaw = camera.rotation.y; cam.pitch = camera.rotation.x; }
}

let dragging = false, lastX = 0, lastY = 0;
const cv = renderer.domElement;
const raycaster = new THREE.Raycaster();
const hitSphere = new THREE.Mesh(new THREE.SphereGeometry(9, 8, 6), new THREE.MeshBasicMaterial({ visible: false }));
condor.group.add(hitSphere);
cv.addEventListener('pointerdown', (e) => {
  if (mode !== 'game') {
    raycaster.setFromCamera(new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), camera);
    if (raycaster.intersectObject(hitSphere).length) setMode('game');
    return;
  }
  dragging = true; lastX = e.clientX; lastY = e.clientY; cv.setPointerCapture(e.pointerId); document.activeElement?.blur?.();
});
cv.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const dx = (e.clientX - lastX) * 0.0025, dy = (e.clientY - lastY) * 0.0025;
  if (P.cameraMode === 'condor') {
    orbit.yaw -= dx;
    orbit.pitch = clamp(orbit.pitch + dy, -0.6, 1.2);
  } else {
    cam.yaw -= dx;
    cam.pitch = clamp(cam.pitch - dy, -1.5, 1.5);
  }
  lastX = e.clientX; lastY = e.clientY;
});
cv.addEventListener('pointerup', () => { dragging = false; });
cv.addEventListener('wheel', (e) => {
  if (mode !== 'game') return; // let the page scroll
  const f = e.deltaY > 0 ? 0.88 : 1.14;
  if (P.cameraMode === 'condor') P.flightSpeed = clamp(P.flightSpeed * f, 0, 300);
  else P.flySpeed = clamp(P.flySpeed * f, 2, 600);
  refreshGui();
}, { passive: true });

const _fwd = new THREE.Vector3(), _right = new THREE.Vector3(), _tmp = new THREE.Vector3(), _look = new THREE.Vector3();
let flightTime = 0;

// crash / respawn: fade to black, reset to the starting point, fade back in. A teleport (the map)
// rides the same fade: `to` is where the bird lands instead of the starting point
const fadeEl = document.getElementById('fade');
let crash = { state: 'none', t: 0, z: 0, to: null };
function triggerCrash() {
  if (crash.state !== 'none') return;
  crash = { state: 'out', t: 0, z: condor.pos.z, to: null };
  fadeEl.style.opacity = 1;
}
function updateCrash(dt) {
  if (crash.state === 'none') return false;
  crash.t += dt;
  if (crash.state === 'out' && crash.t > 1.0) {
    if (crash.to?.at) {
      if (!landBeside()) resetCamera(crash.z);
    } else if (crash.to) placeAt(crash.to.x, crash.to.z, P.startAltitude); else resetCamera(crash.z);
    crash = { state: 'load', t: 0, z: crash.z, to: crash.to };
  } else if (crash.state === 'load') {
    // a visit keeps following its condor while the screen is black: they fly on meanwhile, and
    // their precise pose (with a heading to fly alongside) only arrives once the flock has seen
    // the visitor move here, so the black holds up to 3 s for it
    let settled = true;
    if (crash.to?.at) { const p = landBeside(); settled = !p || p.precise || crash.t > 3; }
    // stay black until the relief under the bird is in and built (a teleport lands on tiles that
    // are still streaming; a respawn is on loaded ones and passes at once), 5 s at most
    const ready = !H?.real || crash.t > 5 || (settled && crash.t > 0.15 && lastPending === 0 && real.loaded(condor.pos.x / H.upk, H.zKm(condor.pos.z), (P.viewDistance + 1.5 * grid.D) / H.upk));
    if (ready) { crash = { state: 'in', t: 0, z: 0, to: null }; fadeEl.style.opacity = 0; }
  } else if (crash.state === 'in' && crash.t > 0.9) {
    crash = { state: 'none', t: 0, z: 0, to: null };
  }
  return crash.state === 'out' || crash.state === 'load';
}
// beside another condor, wherever they are right now (the screen is black), kept inside the
// flyable box: a bird at the edge would land its visitor in a crash. False once they are gone
function landBeside() {
  const p = crash.to.at();
  if (!p) return null;
  const halfW = grid.width / 2 - P.boundsMargin - 2 * H.upk;
  condor.yaw = p.yaw;
  placeAt(clamp(p.x, -halfW, halfW), p.z, Math.min(p.y, P.maxAltitude - 10));
  crash.z = p.z;
  crash.to.kmX = condor.pos.x / H.upk; crash.to.kmZ = H.zKm(condor.pos.z); // the tiles stream toward the landing
  return p;
}
// fly the bird to a point of the country (km east of the centreline, km south of the north edge):
// the crash fade, then it lands there level on its current heading, and the fade lifts once the
// relief has streamed. It stays in the same mirrored copy of the strip, so north keeps its
// direction on screen
// `label` names the destination in the toast (a search pick); otherwise the nearest city, or the coordinates
function teleport(kmX, kmZ, label = null) {
  if (!H?.real || mode !== 'game' || crash.state !== 'none') return;
  const halfKm = (grid.width / 2 - P.boundsMargin) / H.upk - 2;
  kmX = clamp(kmX, -halfKm, halfKm);
  kmZ = clamp(kmZ, 1, real.lengthKm - 1);
  const L = H.L, n = Math.floor(condor.pos.z / (2 * L)), t = condor.pos.z - 2 * L * n;
  const z = 2 * L * n + (t <= L ? kmZ * H.upk : 2 * L - kmZ * H.upk);
  crash = { state: 'out', t: 0, z, to: { x: kmX * H.upk, z, kmX, kmZ } };
  fadeEl.style.opacity = 1;
  const near = real.cities.filter((c) => Math.hypot(c.kmX - kmX, c.kmZ - kmZ) < 40).sort((a, b) => b.pop - a.pop)[0];
  const { lat, lon } = real.toLatLon(kmX, kmZ);
  toast(label ? `→ ${label}` : near ? `→ ${near.name}` : `→ ${Math.abs(lat).toFixed(2)}° S · ${Math.abs(lon).toFixed(2)}° O`);
}
// the same fade toward another condor (the flock, app/frontend/flock/visit.ts): `at()` gives the
// landing (world units, local copy, with a heading) once the screen is black, since the target
// keeps flying; the tiles stream toward (kmX, kmZ) meanwhile. Returns whether the flight started
function teleportBeside(kmX, kmZ, at, label) {
  if (!H?.real || mode !== 'game' || crash.state !== 'none') return false;
  crash = { state: 'out', t: 0, z: condor.pos.z, to: { kmX, kmZ, at } };
  fadeEl.style.opacity = 1;
  toast(label);
  return true;
}

// ---------------------------------------------------------------- landing-page modes
// 'ambient': autopilot behind the hero, no input, cheap rendering.  'game': the flight sim.
let mode = 'ambient';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let heroVisible = true;
const camView = { side: 0, lookUp: 1.5, distance: P.camDistance }; // eased between the two framings
function setMode(m) {
  if (m === mode) return;
  mode = m;
  document.body.classList.toggle('game', m === 'game');
  if (m === 'game') {
    scrollTo({ top: 0, behavior: 'instant' });
    for (const k in keys) keys[k] = false;
    crash = { state: 'none', t: 0, z: 0 };
    fadeEl.style.opacity = 0;
    // every flight starts over Santiago (resetCamera scatters the spawns and clears the ground),
    // not wherever the ambient lane had drifted to, so arriving pilots find each other
    if (H) resetCamera(homeZ());
    document.getElementById('exit').focus?.({ preventScroll: true });
  } else {
    gui.hide();
    closeSearch(false);
    for (const k in keys) keys[k] = false;
  }
  window.condorFlock?.setMode(m);
}
document.getElementById('play').addEventListener('click', () => setMode('game'));
document.getElementById('exit').addEventListener('click', () => setMode('ambient'));
new IntersectionObserver(([en]) => { heroVisible = en.isIntersecting; }, { threshold: 0.05 }).observe(document.getElementById('hero'));
// The flock's view of the scene (app/frontend/flock/hooks.ts): the pieces the other condors are drawn into.
const flockHooks = {
  scene, camera, condor, keys, P,
  terrain() { return H?.real ? { L: H.L, upk: H.upk, vs: H.vs, height: H.height, zKm: H.zKm } : null; },
  cities() { return real.cities; },
  teleportBeside,
  mapOverlay: null, // set by the flock: the other condors on the map
  makeCondor() {
    const mats = [], edges = [];
    const built = makeCondorMesh(mats, edges);
    return { ...built, dispose() { built.parts.forEach((o) => o.traverse((c) => c.geometry?.dispose())); mats.forEach((m) => m.dispose()); edges.forEach((m) => m.dispose()); } };
  },
  mode() { return mode; },
};
window.condorScene = { setMode, teleport, get mode() { return mode; }, flock: flockHooks, bird() { return { x: condor.pos.x, y: condor.pos.y, z: condor.pos.z, yaw: condor.yaw, crash: crash.state, to: crash.to }; }, probe(x, z) { return { terrain: H.height(x, z), obstacle: H.obstacle ? H.obstacle(x, z) : null }; }, cityCands() { return lastCityCands; }, quality() { return { tier: quality.tier, target: quality.target, locked: quality.locked, verdict: quality.verdict, dprLimit: quality.dprLimit, pendingFog: quality.pendingFog, pending: lastPending, fadingChunks: fading.length, name: QUALITY[quality.tier].name, gpu: quality.gpu, displayMs: quality.displayMs, viewDistance: P.viewDistance, fog: P.fogDensity, dprCap: quality.dprCap, bloom: P.bloom, frames: quality.frames.length }; }, stats() { const byLod = {}; for (const c of chunks.values()) byLod[c.lod] = (byLod[c.lod] || 0) + 1; return { chunks: chunks.size, byLod, tiles: real.tiles.size, tileBytes: real.bytes, peaks: real.peaks.length, slowestBuilds: [...buildTimes].sort((a, b) => b[1] - a[1]).slice(0, 6), buildTotalMs: buildTimes.reduce((a, b) => a + b[1], 0) }; } }; // tiny API for the host page (and tests)

function ambientInputs(dt) {
  // autopilot: hold a lane beside the coast, cruise altitude, and a slow lazy sway
  const t = flightTime;
  const targetX = H?.real ? P.laneKm * H.upk : (H ? H.coastX(condor.pos.z) : P.coastOffset) + P.ambientOffset;
  const sway = reducedMotion ? 0 : Math.sin(t * 0.25) * P.ambientSway;
  // heading 0 is toward -z; a positive yaw swings the bird toward -x, so the lane correction is negated
  const desiredYaw = -clamp((targetX - condor.pos.x) * 0.008, -0.25, 0.25) + sway;
  let dyaw = desiredYaw - condor.yaw;
  dyaw = Math.atan2(Math.sin(dyaw), Math.cos(dyaw));
  const turn = clamp(dyaw * 1.5, -1, 1);
  // terrain following: never lower than the highest ground in the next stretch plus a clearance
  let floor = 0;
  if (H) for (let k = 0; k <= 8; k++) {
    const d = k * 40;
    floor = Math.max(floor, groundAt(condor.pos.x - Math.sin(condor.yaw) * d, condor.pos.z - Math.cos(condor.yaw) * d) + P.ambientClearance);
  }
  const climb = clamp((Math.max(P.ambientAltitude, floor) - condor.pos.y) * 0.04, -0.4, 0.6);
  return { turn, climb, speed: P.ambientSpeed * (reducedMotion ? 0.25 : 1), bank: P.bankAngle * 0.35 };
}

function updateCondor(dt) {
  const ambient = mode !== 'game';
  const frozen = ambient ? false : updateCrash(dt);
  let turn, climb, boost = 1, speed = P.flightSpeed, bank = P.bankAngle;
  if (ambient) ({ turn, climb, speed, bank } = ambientInputs(dt));
  else {
    turn = frozen ? 0 : (keys.KeyA || keys.ArrowLeft ? 1 : 0) - (keys.KeyD || keys.ArrowRight ? 1 : 0);
    climb = frozen ? 0 : (keys.KeyW || keys.ArrowUp || keys.Space ? 1 : 0) - (keys.KeyS || keys.ArrowDown || keys.KeyC ? 1 : 0);
    boost = !frozen && (keys.ShiftLeft || keys.ShiftRight) ? 2.2 : 1;
  }
  if (frozen) dt = 0; // hold still while the screen is black

  // bank into turns; yaw rate follows the bank so turns feel like gliding, not steering
  condor.roll += (turn * bank - condor.roll) * Math.min(1, dt * 3);
  condor.yaw += (condor.roll / Math.max(bank, 0.01)) * P.turnRate * dt;
  condor.pitch += (climb * P.maxPitch - condor.pitch) * Math.min(1, dt * 2.5);

  const cp = Math.cos(condor.pitch);
  _fwd.set(-Math.sin(condor.yaw) * cp, Math.sin(condor.pitch), -Math.cos(condor.yaw) * cp);
  condor.pos.addScaledVector(_fwd, speed * boost * dt);
  condor.speed = speed * boost; // what the flock reports (units/s)

  // collisions: terrain or sea surface, leaving the terrain width, or climbing out of the world
  if (!ambient && P.collisions && H && crash.state === 'none') {
    const ground = Math.max(groundAt(condor.pos.x, condor.pos.z), 0);
    const halfW = grid.width / 2 - P.boundsMargin;
    if (condor.pos.y < ground + P.crashMargin || Math.abs(condor.pos.x) > halfW || condor.pos.y > P.maxAltitude) triggerCrash();
  }

  // pose + wing animation (glide flap, faster under boost, wings rise a little when banking)
  flightTime += dt * (boost > 1 ? 2 : 1);
  const flap = Math.sin(flightTime * P.flapSpeed) * P.flapAmount + 0.12 + Math.abs(condor.roll) * 0.15;
  condor.wingR.rotation.z = flap;
  condor.wingL.rotation.z = -flap;
  condor.group.position.copy(condor.pos);
  condor.group.rotation.set(condor.pitch, condor.yaw, condor.roll);

  // chase camera: sits behind and above (plus the drag orbit offset), eased toward its target.
  // Ambient framing pushes the bird to the lower right so the hero copy sits over the sky.
  const k = 1 - Math.exp(-dt * 2);
  camView.side += ((ambient ? P.ambientSide : 0) - camView.side) * k;
  camView.lookUp += ((ambient ? P.ambientLookUp : 1.5) - camView.lookUp) * k;
  camView.distance += ((ambient ? P.ambientDistance : P.camDistance) - camView.distance) * k;
  const oy = condor.yaw + orbit.yaw, ocp = Math.cos(orbit.pitch), osp = Math.sin(orbit.pitch);
  const sx = -Math.cos(condor.yaw), sz = Math.sin(condor.yaw); // left-hand side of the bird (yaw only); positive side => bird sits right of frame
  _tmp.set(condor.pos.x + Math.sin(oy) * ocp * camView.distance + sx * camView.side,
           condor.pos.y + P.camHeight + osp * camView.distance,
           condor.pos.z + Math.cos(oy) * ocp * camView.distance + sz * camView.side);
  camera.position.lerp(_tmp, 1 - Math.exp(-dt * P.camLag));
  _look.copy(condor.pos).addScaledVector(_fwd, P.lookAhead).y += camView.lookUp;
  _look.x += sx * camView.side; _look.z += sz * camView.side;
  camera.lookAt(_look);
  if (!ambient) camera.rotateZ(condor.roll * 0.15);
}

function updateFreeCamera(dt) {
  camera.rotation.set(cam.pitch, cam.yaw, 0);
  const boost = keys.ShiftLeft || keys.ShiftRight ? 3 : 1;
  const step = P.flySpeed * boost * dt;
  camera.getWorldDirection(_fwd);
  _right.crossVectors(_fwd, camera.up).normalize();
  if (keys.KeyW || keys.ArrowUp) camera.position.addScaledVector(_fwd, step);
  if (keys.KeyS || keys.ArrowDown) camera.position.addScaledVector(_fwd, -step);
  if (keys.KeyD || keys.ArrowRight) camera.position.addScaledVector(_right, step);
  if (keys.KeyA || keys.ArrowLeft) camera.position.addScaledVector(_right, -step);
  if (keys.Space || keys.KeyE) camera.position.y += step;
  if (keys.KeyC || keys.KeyQ) camera.position.y -= step;
}

function updateCamera(dt) {
  if (P.cameraMode === 'condor') { updateCondor(dt); focus.copy(condor.pos); }
  else { updateFreeCamera(dt); focus.copy(camera.position); }
}

// ---------------------------------------------------------------- gui
const gui = new GUI({ title: 'Andes Synthwave' });
gui.hide();
let rebuildTimer = 0;
const scheduleRebuild = () => { clearTimeout(rebuildTimer); rebuildTimer = setTimeout(buildTerrain, 80); };
const refreshGui = () => gui.controllersRecursive().forEach((c) => c.updateDisplay());

const fReal = gui.addFolder('Cordillera');
fReal.add(P, 'terrain', { 'Chile (real relief)': 'chile', 'Procedural noise': 'procedural' }).name('terrain');
fReal.add(P, 'unitsPerKm', 4, 60, 0.5).name('units per km');
fReal.add(P, 'exaggeration', 1, 8, 0.1).name('vertical exaggeration');
fReal.add(P, 'snowLineM', 1000, 6500, 50).name('snow line (m)');
fReal.add(P, 'landBase', 0, 10, 0.1).name('shore height');
fReal.onChange(scheduleRebuild);
const fCity = gui.addFolder('City');
fCity.add(P, 'showBuildings').name('buildings');
fCity.add(P, 'blockMin', 0, 0.5, 0.01).name('min built fraction');
fCity.add(P, 'blockScale', 0.5, 6, 0.1).name('block height x');
fCity.addColor(P, 'blockColor').name('block faces');
fCity.addColor(P, 'blockWire').name('block wire');
fCity.add(P, 'landmarkScale', 0.5, 4, 0.1).name('tower height x');
fCity.add(P, 'landmarkFootprint', 1, 8, 0.1).name('tower footprint x');
fCity.addColor(P, 'landmarkWire').name('tower wire');
fCity.onChange(scheduleRebuild);
const fWater = gui.addFolder('Water');
fWater.add(P, 'showWater').name('lakes & rivers');
fWater.add(P, 'riverLift', 0, 2, 0.05).name('river lift');
fWater.add(P, 'lakeLabels').name('lake names');
fWater.add(P, 'lakeLabelKm2', 0.5, 100, 0.5).name('min lake km²');
fWater.onChange(scheduleRebuild);
fWater.add(P, 'riverOpacity', 0, 1, 0.01).name('river opacity').onChange(applyAtmosphere);
const fCities = gui.addFolder('City names');
fCities.add(P, 'cityLabels').name('waypoints');
fCities.add(P, 'cityLabelCount', 1, 8, 1).name('max cities');
fCities.add(P, 'cityMinPop', 1000, 500000, 1000).name('min population');
fCities.add(P, 'cityLabelRange', 500, 20000, 100).name('label range');
const fPeaks = gui.addFolder('Peak names');
fPeaks.add(P, 'peakLabels').name('show names');
fPeaks.add(P, 'peakLabelCount', 1, 30, 1).name('max labels');
fPeaks.add(P, 'peakLabelRange', 100, 2500, 10).name('label range');

const fQuality = gui.addFolder('Quality');
fQuality.add(P, 'quality', { 'Auto (device + frame times)': 'auto', Low: 0, Medium: 1, High: 2, Ultra: 3 }).name('tier').onChange((v) => { if (v !== 'auto') setTier(v); });
fQuality.add(P, 'fogAuto').name('fog follows view distance').onChange(() => setTier(quality.tier));
fQuality.add({ get info() { return `${QUALITY[quality.tier].name}${quality.locked ? ' (locked)' : ''} · ${quality.verdict}`; } }, 'info').name('running').listen().disable();

const fMesh = gui.addFolder('Mesh & streaming');
fMesh.add(P, 'cellSize', 1, 40, 0.5).name('cell size');
fMesh.add(P, 'chunkSize', 100, 1000, 20).name('chunk size');
fMesh.add(P, 'viewDistance', 300, 4000, 10).name('view distance');
fMesh.add(P, 'backDistance', 0, 1000, 10).name('kept behind');
fMesh.add(P, 'prefetchKm', 0, 300, 5).name('tiles ahead (km)');
fMesh.add(P, 'chunkFade', 0, 3, 0.1).name('chunk fade-in (s)');
fMesh.add(P, 'lod').name('distance LOD');
fMesh.add(P, 'lodNear', 100, 3000, 10).name('LOD 2x beyond');
fMesh.add(P, 'lodFar', 200, 4000, 10).name('LOD 4x beyond');
fMesh.onChange(scheduleRebuild);
fMesh.close();

const fShape = gui.addFolder('Mountains (procedural)');
fShape.add(P, 'seed', 0, 99999, 1);
fShape.add({ randomize: () => { P.seed = Math.floor(Math.random() * 99999); refreshGui(); buildTerrain(); } }, 'randomize').name('🎲 random seed');
fShape.add(P, 'size', 200, 6000, 10).name('terrain width');
fShape.add(P, 'amplitude', 0, 300, 1).name('height');
fShape.add(P, 'scale', 40, 800, 1).name('feature scale');
fShape.add(P, 'octaves', 1, 8, 1);
fShape.add(P, 'lacunarity', 1.2, 3.5, 0.01);
fShape.add(P, 'gain', 0.2, 0.9, 0.01).name('roughness (gain)');
fShape.add(P, 'ridgeOffset', 0.5, 1.5, 0.01).name('ridge offset');
fShape.add(P, 'ridgeGain', 0, 5, 0.05).name('ridge sharpness');
fShape.add(P, 'peakiness', 0.3, 4, 0.01).name('peakiness (pow)');
fShape.add(P, 'baseAmp', 0, 60, 0.5).name('base rolling');
fShape.add(P, 'baseScale', 40, 600, 1).name('base scale');
fShape.add(P, 'rangeBias', 0, 3, 0.01).name('taller at edges');
fShape.onChange(scheduleRebuild);

const fCoast = gui.addFolder('Coast & Sea');
fCoast.add(P, 'coastOffset', -400, 400, 1).name('coast position');
fCoast.add(P, 'coastMeander', 0, 300, 1).name('coast meander');
fCoast.add(P, 'coastScale', 60, 1200, 1).name('meander scale');
fCoast.add(P, 'shelfWidth', 5, 300, 1).name('shelf width');
fCoast.add(P, 'beachWidth', 0, 200, 1).name('beach width');
fCoast.add(P, 'mountainFalloff', 5, 500, 1).name('mountain rise');
fCoast.add(P, 'seaDepth', 0, 40, 0.5).name('sea depth');
fCoast.add(P, 'seaResolution', 10, 800, 1).name('sea resolution');
fCoast.onChange(scheduleRebuild);
fCoast.add(P, 'waveAmp', 0, 6, 0.05).name('wave height').onChange(applyAtmosphere);
fCoast.add(P, 'waveFreq', 0.01, 0.3, 0.005).name('wave frequency').onChange(applyAtmosphere);
fCoast.add(P, 'waveSpeed', 0, 4, 0.05).name('wave speed');
fWater.addColor(P, 'seaDeep').name('water deep').onChange(applyAtmosphere);
fWater.addColor(P, 'seaCrest').name('water crest').onChange(applyAtmosphere);
fWater.addColor(P, 'seaWireColor').name('water wire').onChange(applyAtmosphere);
fWater.add(P, 'seaWireOpacity', 0, 1, 0.01).name('water wire opacity').onChange(applyAtmosphere);

const fColors = gui.addFolder('Terrain colors');
fColors.addColor(P, 'colorLow').name('floor');
fColors.addColor(P, 'colorMid').name('slopes');
fColors.addColor(P, 'colorHigh').name('high');
fColors.addColor(P, 'colorPeak').name('peaks');
fColors.add(P, 'midPoint', 0.05, 0.9, 0.01).name('slope point');
fColors.add(P, 'colorScale', 0.2, 2, 0.01).name('color range');
fColors.add(P, 'faceShadeFloor', 0, 1, 0.01).name('shade floor');
fColors.add(P, 'diagonals').name('wire diagonals');
fColors.onChange(scheduleRebuild);
fColors.addColor(P, 'wireColor').name('wire color').onChange(scheduleRebuild);
fColors.add(P, 'wireOpacity', 0, 1, 0.01).name('wire opacity').onChange(applyAtmosphere);
fColors.addColor(P, 'snowColor').name('snow color').onChange(scheduleRebuild);
fColors.add(P, 'snowLine', 0, 1, 0.01).name('snow line').onChange(scheduleRebuild);
fColors.add(P, 'snowBlend', 0.01, 0.5, 0.01).name('snow blend').onChange(scheduleRebuild);
fColors.add(P, 'snowFaceTone', 0.2, 1, 0.01).name('snow face tone').onChange(scheduleRebuild);
fColors.close();

const fSky = gui.addFolder('Sky & Sun');
fSky.addColor(P, 'skyTop').name('sky top');
fSky.addColor(P, 'skyHorizon').name('sky horizon');
fSky.addColor(P, 'skyBottom').name('sky below');
fSky.add(P, 'showSun').name('show sun');
fSky.addColor(P, 'sunTop').name('sun top');
fSky.addColor(P, 'sunBottom').name('sun bottom');
fSky.add(P, 'sunSize', 0.02, 0.6, 0.005).name('sun size');
fSky.add(P, 'sunElevation', -0.2, 1.2, 0.005).name('sun elevation').onChange(scheduleRebuild); // the face shade is baked
fSky.add(P, 'sunAzimuth', -Math.PI, Math.PI, 0.01).name('sun azimuth').onChange(scheduleRebuild);
fSky.add(P, 'stripes', 0, 30, 1).name('sun stripes');
fSky.add(P, 'glow', 0, 3, 0.01).name('sun glow');
fSky.add(P, 'stars', 0, 0.4, 0.005).name('stars');
fSky.onChange(applySky);
fSky.close();

const fAtm = gui.addFolder('Atmosphere & Post');
fAtm.addColor(P, 'fogColor').name('fog color');
fAtm.add(P, 'fogDensity', 0, 0.01, 0.0001).name('fog density');
fAtm.addColor(P, 'lightColor').name('sun light');
fAtm.add(P, 'lightIntensity', 0, 6, 0.05).name('light intensity');
fAtm.add(P, 'ambient', 0, 4, 0.05).name('ambient');
fAtm.add(P, 'toneMapping', Object.keys(TONE)).name('tone mapping');
fAtm.add(P, 'exposure', 0.2, 3, 0.01);
fAtm.add(P, 'bloom');
fAtm.add(P, 'bloomStrength', 0, 3, 0.01).name('bloom strength');
fAtm.add(P, 'bloomRadius', 0, 1.5, 0.01).name('bloom radius');
fAtm.add(P, 'bloomThreshold', 0, 1, 0.01).name('bloom threshold');
fAtm.add(P, 'scanlines').name('CRT scanlines');
fAtm.add(P, 'renderScale', 0.5, 2, 0.05).name('render scale');
fAtm.onChange(applyAtmosphere);
fAtm.close();

const fCam = gui.addFolder('Condor & Camera');
fCam.add(P, 'cameraMode', ['condor', 'free']).name('mode (V)').onChange(onModeChange);
fCam.add(P, 'flightSpeed', 0, 300, 1).name('glide speed');
fCam.add(P, 'turnRate', 0.1, 3, 0.01).name('turn rate');
fCam.add(P, 'bankAngle', 0, 1.3, 0.01).name('bank angle');
fCam.add(P, 'maxPitch', 0, 1.2, 0.01).name('climb angle');
fCam.add(P, 'collisions').name('collisions');
fCam.add(P, 'crashMargin', 0, 20, 0.5).name('crash margin');
fCam.add(P, 'respawnClearance', 0, 200, 5).name('respawn clearance');
fCam.add(P, 'boundsMargin', 0, 400, 5).name('bounds margin');
fCam.add(P, 'maxAltitude', 50, 5000, 10).name('max altitude');
fCam.add(P, 'camDistance', 5, 80, 0.5).name('camera distance');
fCam.add(P, 'camHeight', -5, 40, 0.5).name('camera height');
fCam.add(P, 'camLag', 0.5, 20, 0.1).name('camera smoothing');
fCam.add(P, 'lookAhead', 0, 60, 0.5).name('look ahead');
fCam.add(P, 'flySpeed', 2, 600, 1).name('free-cam speed');
fCam.add(P, 'startLat', -56, -17.5, 0.01).name('start latitude');
fCam.add(P, 'startKm', -250, 250, 1).name('start km east of centre');
fCam.add(P, 'startHeading', -180, 180, 1).name('start heading (°)');
fCam.add(P, 'startAimKm', 1, 60, 1).name('start aim (km ahead)');
fCam.add(P, 'spawnSide', 0, 400, 5).name('spawn scatter across');
fCam.add(P, 'spawnAlong', 0, 400, 5).name('spawn scatter along');
fCam.add(P, 'spawnAltitude', 0, 60, 1).name('spawn scatter altitude');
fCam.add({ reset: () => resetCamera(homeZ()) }, 'reset').name('reset flight (R)');
fCam.close();

const fBird = gui.addFolder('Condor look');
fBird.add(P, 'showCondor').name('show condor');
fBird.add(P, 'condorScale', 0.2, 5, 0.05).name('scale');
fBird.add(P, 'flapAmount', 0, 0.6, 0.01).name('flap amount');
fBird.add(P, 'flapSpeed', 0, 6, 0.05).name('flap speed');
fBird.addColor(P, 'condorBody').name('body');
fBird.addColor(P, 'condorRuff').name('ruff');
fBird.addColor(P, 'condorHead').name('head');
fBird.addColor(P, 'condorPatch').name('wing patch');
fBird.addColor(P, 'condorEdge').name('edge lines');
fBird.add(P, 'condorEdgeOpacity', 0, 1, 0.01).name('edge opacity');
fBird.add(P, 'condorGlow', 0, 1.5, 0.01).name('self glow');
fBird.onChange(buildCondor);
fBird.close();

const fLand = gui.addFolder('Landing / ambient');
fLand.add(P, 'ambientSpeed', 0, 60, 0.5).name('ambient speed');
fLand.add(P, 'ambientAltitude', 5, 600, 1).name('ambient altitude');
fLand.add(P, 'ambientOffset', -300, 300, 1).name('lane from coast');
fLand.add(P, 'laneKm', -250, 250, 1).name('lane km east of centre');
fLand.add(P, 'ambientClearance', 0, 300, 5).name('terrain clearance');
fLand.add(P, 'ambientSway', 0, 0.5, 0.01).name('sway');
fLand.add(P, 'ambientSide', -30, 30, 0.5).name('bird side offset');
fLand.add(P, 'ambientLookUp', -10, 30, 0.5).name('bird lower in frame');
fLand.add(P, 'ambientDistance', 5, 80, 0.5).name('ambient distance');
fLand.add(P, 'ambientFps', 10, 60, 1).name('ambient fps cap');
fLand.add(P, 'ambientBloom', 0, 1.5, 0.01).name('ambient bloom');
fLand.add({ ambient: () => setMode('ambient') }, 'ambient').name('⏏ back to landing (Esc)');
fLand.close();

const fIO = gui.addFolder('Save / Share');
fIO.add({ copy: () => copyText(JSON.stringify(P, null, 2), 'Settings JSON copied') }, 'copy').name('📋 copy settings JSON');
fIO.add({ link: () => { const url = makeShareUrl(); history.replaceState(null, '', url); copyText(url, 'Share link copied (also in address bar)'); } }, 'link').name('🔗 copy share link');
fIO.add({ reset: () => { Object.assign(P, DEFAULTS); refreshGui(); applySky(); applyAtmosphere(); buildCondor(); buildTerrain(); } }, 'reset').name('↺ reset defaults');

function makeShareUrl() {
  const state = {
    p: P,
    c: { x: camera.position.x, y: camera.position.y, z: camera.position.z, yaw: cam.yaw, pitch: cam.pitch },
    b: { x: condor.pos.x, y: condor.pos.y, z: condor.pos.z, yaw: condor.yaw },
    m: mode,
  };
  return location.origin + location.pathname + '#s=' + encodeURIComponent(JSON.stringify(state));
}
let hashMode = 'game', hashHasBird = false;
function loadFromHash() {
  if (!location.hash.startsWith('#s=')) return false;
  try {
    const st = JSON.parse(decodeURIComponent(location.hash.slice(3)));
    Object.assign(P, st.p || {});
    if (st.c) { camera.position.set(st.c.x, st.c.y, st.c.z); cam.yaw = st.c.yaw; cam.pitch = st.c.pitch; }
    if (st.b) { condor.pos.set(st.b.x, st.b.y, st.b.z); condor.yaw = st.b.yaw; hashHasBird = true; }
    hashMode = st.m || 'game';
    return true;
  } catch (e) { console.warn('bad share hash', e); return false; }
}
function copyText(text, msg) {
  console.log(text);
  navigator.clipboard?.writeText(text).then(() => toast(msg)).catch(() => toast('Copy failed, printed to console'));
}
let toastTimer;
function toast(msg) {
  const t = document.getElementById('toast'); t.textContent = msg; t.style.opacity = 1;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.style.opacity = 0), 1800);
}

// ---------------------------------------------------------------- boot
const fromHash = loadFromHash();
refreshGui();
applySky();
applyAtmosphere();
buildCondor();
performance.mark('boot:scene');
// the tier the device deserves; the boot reveals at medium at most and ramps up afterwards
quality.target = P.quality === 'auto' ? (fromHash ? 1 : guessTier()) : Number(P.quality);
setTier(Math.min(quality.target, 1), true);
if (P.terrain === 'chile') await real.ready; // index + overview, preloaded from the HTML
performance.mark('boot:index');
if (!fromHash) { condor.pos.set(P.terrain === 'chile' ? P.laneKm * P.unitsPerKm : P.coastOffset + P.startOffset, P.startAltitude, homeZ()); }
focus.copy(P.cameraMode === 'condor' ? condor.pos : camera.position);
buildTerrain();
if (!fromHash) resetCamera();
condor.group.position.copy(condor.pos);
camView.side = P.ambientSide; camView.lookUp = P.ambientLookUp; camView.distance = P.ambientDistance;
if (location.hash === '#fly' || (fromHash && hashMode !== 'ambient')) setMode('game');
if (fromHash && !hashHasBird) resetCamera();
if (H?.real) {
  // stream the tiles for everything in view and hold the reveal until they are in: nothing is
  // ever built from the overview and swapped out on screen
  focus.copy(P.cameraMode === 'condor' ? condor.pos : camera.position);
  const kx = focus.x / H.upk, kz = H.zKm(focus.z), t0 = performance.now();
  const holdKm = (P.viewDistance + 1.5 * grid.D) / H.upk;
  while (!real.loaded(kx, kz, holdKm) && performance.now() - t0 < 8000) {
    streamTiles();
    await real.whenLoaded(kx, kz, holdKm, 1000);
  }
  performance.mark('boot:tiles');
}
// behind the hero, hold the (main-thread heavy) chunk build and the first frame while the logo
// strokes draw; the tiles above already downloaded meanwhile
if (mode !== 'game' && window.logoDone) await window.logoDone;
performance.mark('boot:logo');
booted = true;
if (H?.real) {
  // the near field is built a few ms per frame so the logo keeps animating smoothly; the far
  // chunks (in the fog) keep filling in under the fade. Then one hidden frame compiles the
  // shaders and uploads the buffers, so the first visible frame costs nothing unusual.
  focus.copy(P.cameraMode === 'condor' ? condor.pos : camera.position);
  await new Promise((done) => {
    const t1 = performance.now();
    const step = () => { streamTiles(); (updateChunks(6, P.viewDistance) > 0 && performance.now() - t1 < 10000) ? requestAnimationFrame(step) : done(); };
    step();
  });
  await renderer.compileAsync(scene, camera);
  updateCamera(0);
  sky.position.copy(camera.position);
  if (P.bloom) composer.render(); else renderer.render(scene, camera);
} else updateChunks(Infinity);
performance.mark('boot:chunks');

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
  minimap.base = null;
});

// ---------------------------------------------------------------- names (HUD)
// Labels for summits, towers and cities, pinned to their world point. They are stateful: a label
// that is showing keeps showing until it is clearly outranked, clearly out of range, off screen,
// or occluded for a while (every threshold has hysteresis), and a newcomer must qualify for a few
// frames before it appears. That is what keeps them from flickering at the edges. Each label owns
// its element for its lifetime and enters/exits with a short animation.
const peakLayer = document.getElementById('peaks');
const labels = new Map(); // id -> { el, name, sub, since, occ }
const pending = new Map(); // id -> consecutive frames qualified (entry debounce)
const cooled = new Map(); // id -> time hidden (no re-entry for a while)
const labelPool = [];
let lastCityCands = []; // for the stats
const _pv = new THREE.Vector3(), _pd = new THREE.Vector3();
const LABEL = { enterFrames: 8, minShowMs: 1500, cooldownMs: 900, occludeFrames: 8, exitMs: 150 };
function makeLabelEl() {
  const el = document.createElement('div');
  el.className = 'peak';
  const body = document.createElement('div');
  const name = document.createElement('span'), sub = document.createElement('span');
  body.append(name, sub); el.append(body);
  peakLayer.appendChild(el);
  return { el, name, sub, since: 0, occ: 0 };
}
function occluded(v, d) {
  const steps = Math.min(24, Math.max(6, Math.round(d / 12)));
  const c = camera.position;
  for (let s = 1; s < steps; s++) {
    const t = s / steps;
    if (H.height(c.x + (v.x - c.x) * t, c.z + (v.z - c.z) * t) > c.y + (v.y - c.y) * t + 0.5) return true;
  }
  return false;
}
function hideLabel(id, L, now) {
  L.el.classList.add('out');
  cooled.set(id, now);
  setTimeout(() => { L.el.hidden = true; L.el.classList.remove('out'); labelPool.push(L); }, LABEL.exitMs);
  labels.delete(id);
}
function updatePeakLabels() {
  const now = performance.now();
  const show = mode === 'game' && H?.real && (P.peakLabels || P.cityLabels);
  if (!show) { for (const [id, L] of labels) hideLabel(id, L, now); pending.clear(); return; }
  const c = camera.position;
  camera.getWorldDirection(_pd);
  const fl = Math.hypot(_pd.x, _pd.z) || 1, fx = _pd.x / fl, fz = _pd.z / fl;
  const W = innerWidth, Hh = innerHeight;
  // screen-space gate: a showing label may drift a little further out before it goes
  const onScreen = (sx, sy, active) => {
    const m = active ? 30 : 0;
    return sx >= 8 - m && sx <= W - 180 + m && sy >= 56 - m && sy <= Hh - 8 + m && !(sy < 110 && sx > W - 330);
  };
  const cands = []; // { id, kind, name, sub, score, sx, sy, d, occ }

  if (P.cityLabels) {
    const range = P.cityLabelRange;
    const seg = Math.floor(c.z / H.L) * H.L; // only the strip copy the camera is in
    const list = [];
    for (const ct of real.cities) {
      if (ct.pop < P.cityMinPop && !ct.always) continue;
      const x = H.kmX(ct.kmX);
      for (const z of H.zCopies(ct.kmZ, seg, seg + H.L)) {
        const id = 'c:' + ct.name, active = labels.has(id);
        const dx = x - c.x, dz = z - c.z, d = Math.hypot(dx, dz);
        if (d < 1 || d > range * (active ? 1.15 : 1)) continue;
        const ahead = (dx * fx + dz * fz) / d;
        if (ahead < (active ? 0.0 : 0.05)) continue;
        const km = d / H.upk;
        _pv.set(x, H.height(x, z) + 1, z).project(camera);
        const sx = ((_pv.x + 1) / 2) * W, sy = ((1 - _pv.y) / 2) * Hh;
        if (!onScreen(sx, sy, active)) continue;
        const sub = `${Math.max(1, km).toFixed(0)} km · ${ct.pop >= 1e6 ? (ct.pop / 1e6).toFixed(1) + ' M' : Math.round(ct.pop / 1000) + ' mil'} hab.`;
        list.push({ id, kind: 'city', name: ct.name, sub, score: (Math.max(ct.pop, ct.always ? 200000 : 0) * ahead * ahead) / (km + 15), sx, sy, d, occ: false, km, ahead, opacity: 1 });
      }
    }
    list.sort((a, b) => b.score - a.score);
    lastCityCands = list.slice(0, 6).map((cd) => `${cd.name} ${cd.km.toFixed(0)}km ahead=${cd.ahead.toFixed(2)} score=${cd.score.toFixed(0)}`);
    cands.push(...list);
  }
  if (P.peakLabels) {
    const range = P.peakLabelRange;
    const consider = (id, name, ele, v, boost) => {
      const active = labels.has(id);
      const dx = v.x - c.x, dy = v.y - c.y, dz = v.z - c.z;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d > range * (active ? 1.15 : 1) || d < 3 || dx * _pd.x + dy * _pd.y + dz * _pd.z <= 0) return;
      _pv.set(v.x, v.y, v.z).project(camera);
      const sx = ((_pv.x + 1) / 2) * W, sy = ((1 - _pv.y) / 2) * Hh;
      if (!onScreen(sx, sy, active)) return;
      const km = d / H.upk;
      if (ele < km * 8 * (active ? 0.85 : 1)) return; // a hill far away is not worth a label
      cands.push({ id, kind: 'peak', name, sub: `${ele} m · ${Math.max(1, km).toFixed(0)} km`, score: (ele * boost) / (km + 5), sx, sy, d, occ: occluded(v, d), opacity: Math.max(0.35, 1 - 0.65 * (d / range)) });
    };
    for (const p of real.peaks) for (const z of H.zCopies(p.kmZ, c.z - range, c.z + range)) consider('p:' + p.name + '@' + p.ele, p.name, p.ele, peakVertex(p, z), 1);
    for (const l of real.landmarks) for (const z of H.zCopies(l.kmZ, c.z - range, c.z + range)) consider('l:' + l.name, l.name, l.h, landmarkTop(l, z), 6);
    // lakes: pinned to their surface at the centre of the body; size, not height, is what earns
    // the label (a body across several tiles is listed once per tile, so ids are deduplicated)
    if (P.showWater && P.lakeLabels) {
      const seen = new Set();
      for (const l of real.lakes) {
        if (!l.name || l.level <= 0 || l.areaKm2 < P.lakeLabelKm2 || seen.has(l.name)) continue;
        seen.add(l.name);
        const id = 'w:' + l.name, active = labels.has(id), x = H.kmX(l.kmX), y = P.landBase + l.level * H.vs;
        for (const z of H.zCopies(l.kmZ, c.z - range, c.z + range)) {
          const dx = x - c.x, dy = y - c.y, dz = z - c.z;
          const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (d > range * (active ? 1.15 : 1) || d < 3 || dx * _pd.x + dy * _pd.y + dz * _pd.z <= 0) continue;
          _pv.set(x, y, z).project(camera);
          const sx = ((_pv.x + 1) / 2) * W, sy = ((1 - _pv.y) / 2) * Hh;
          if (!onScreen(sx, sy, active)) continue;
          const km = d / H.upk, area = l.areaKm2 >= 10 ? l.areaKm2.toFixed(0) : l.areaKm2.toFixed(1);
          cands.push({ id, kind: 'peak', name: l.name, sub: `${area} km² · ${Math.max(1, km).toFixed(0)} km`, score: (Math.sqrt(l.areaKm2) * 400) / (km + 5), sx, sy, d, occ: occluded({ x, y, z }, d), opacity: Math.max(0.35, 1 - 0.65 * (d / range)) });
        }
      }
    }
  }
  cands.sort((a, b) => b.score - a.score);

  // occlusion is smoothed per showing label: it takes a few frames of being hidden to drop it
  for (const cd of cands) {
    const L = labels.get(cd.id);
    if (L) { L.occ = cd.occ ? L.occ + 1 : 0; cd.blocked = L.occ >= LABEL.occludeFrames; }
    else cd.blocked = cd.occ;
  }

  // selection per kind: showing labels keep their slot unless clearly outranked; newcomers need
  // a free slot, a few qualifying frames in a row, and no exit in the last moment
  const chosen = [], claimed = [];
  const overlaps = (cd) => claimed.some((q) => Math.abs(q.sx - cd.sx) < 160 && Math.abs(q.sy - cd.sy) < 48);
  for (const kind of ['city', 'peak']) {
    const max = kind === 'city' ? (P.cityLabels ? Math.round(P.cityLabelCount) : 0) : (P.peakLabels ? Math.round(P.peakLabelCount) : 0);
    const ofKind = cands.filter((cd) => cd.kind === kind && !cd.blocked);
    const cutoff = ofKind[max]?.score ?? 0; // the best candidate that would not fit
    let n = 0;
    for (const cd of ofKind) { // the ones already showing, best first
      const L = labels.get(cd.id);
      if (!L || n >= max) continue;
      if (now - L.since >= LABEL.minShowMs && cd.score < cutoff * 0.6) continue; // clearly outranked
      if (overlaps(cd)) continue;
      cd.L = L; chosen.push(cd); claimed.push(cd); n++;
    }
    for (const cd of ofKind) { // then newcomers
      if (n >= max) break;
      if (labels.has(cd.id) || cd.occ) continue;
      const t = cooled.get(cd.id);
      if (t !== undefined && now - t < LABEL.cooldownMs) continue;
      const k = (pending.get(cd.id) ?? 0) + 1;
      pending.set(cd.id, k);
      cd.qualified = true;
      if (k < LABEL.enterFrames || overlaps(cd)) continue;
      chosen.push(cd); claimed.push(cd); n++;
    }
  }
  for (const id of [...pending.keys()]) if (labels.has(id) || !cands.some((cd) => cd.id === id && cd.qualified)) pending.delete(id);

  // apply: hide the dropped, create the new, move the rest
  const keep = new Set(chosen.map((cd) => cd.id));
  for (const [id, L] of labels) if (!keep.has(id)) hideLabel(id, L, now);
  for (const cd of chosen) {
    let L = cd.L;
    if (!L) {
      L = labelPool.pop() ?? makeLabelEl();
      L.since = now; L.occ = 0;
      L.el.hidden = false;
      L.el.className = cd.kind === 'city' ? 'peak city' : 'peak';
      L.name.textContent = cd.name;
      labels.set(cd.id, L);
      pending.delete(cd.id);
    }
    L.sub.textContent = cd.sub;
    L.el.style.transform = `translate(${cd.sx.toFixed(1)}px, ${cd.sy.toFixed(1)}px) translateY(-100%)`;
    L.el.style.opacity = cd.opacity.toFixed(2);
  }
}

// ---------------------------------------------------------------- the map of Chile
// Bottom right in game mode: the dataset's outline (corridor km, projected back to lat/lon so the
// country keeps its true shape; the Rapa Nui insert is one of its rings) as a soft silhouette,
// and the condor with its heading. A click anywhere on it flies the condor there.
const minimap = { el: document.getElementById('minimap'), base: null, w: 0, h: 0, pad: 8, s: 1, u0: 0, v0: 0, cosLat: 1 };
// map units: u degrees of longitude east (scaled so km are true at the country's middle latitude), v degrees south
function mapPx(kmX, kmZ) {
  const { lat, lon } = real.toLatLon(kmX, kmZ);
  return [minimap.pad + (lon - minimap.u0) * minimap.cosLat * minimap.s, minimap.pad + (minimap.v0 - lat) * minimap.s];
}
function mapKm(px, py) {
  return real.toKm(minimap.v0 - (py - minimap.pad) / minimap.s, minimap.u0 + (px - minimap.pad) / minimap.s / minimap.cosLat);
}
function buildMinimap() {
  const el = minimap.el, I = real.index, rings = I?.outline;
  minimap.base = null;
  if (!rings || !H?.real) { el.hidden = true; return; }
  el.hidden = false;
  // the mainland and the big islands; islets would read as stray dots next to the condor. An
  // insert (Rapa Nui) stays whatever its size: it is a destination
  const inserts = (I.inserts ?? []).map((ins) => ({ x: ins.kmX, z: real.latToKmZ(ins.lat), r: ins.radiusKm }));
  const shown = rings.filter((r) => {
    let xa = Infinity, xb = -Infinity, za = Infinity, zb = -Infinity;
    for (const [x, z] of r) { xa = Math.min(xa, x); xb = Math.max(xb, x); za = Math.min(za, z); zb = Math.max(zb, z); }
    return Math.max(xb - xa, zb - za) >= 40 || inserts.some((ins) => Math.hypot(r[0][0] - ins.x, r[0][1] - ins.z) <= ins.r);
  });
  let latA = Infinity, latB = -Infinity, lonA = Infinity, lonB = -Infinity;
  for (const [x, z] of shown.flat()) {
    const { lat, lon } = real.toLatLon(x, z);
    latA = Math.min(latA, lat); latB = Math.max(latB, lat); lonA = Math.min(lonA, lon); lonB = Math.max(lonB, lon);
  }
  minimap.cosLat = Math.cos((((latA + latB) / 2) * Math.PI) / 180);
  minimap.u0 = lonA; minimap.v0 = latB;
  const h = el.clientHeight; // the CSS height; the width follows the country's shape
  minimap.s = (h - 2 * minimap.pad) / (latB - latA);
  const w = Math.round((lonB - lonA) * minimap.cosLat * minimap.s + 2 * minimap.pad);
  el.style.width = `${w}px`;
  minimap.w = w; minimap.h = h;
  // the search panel sits left of the map and its button right over the country's northern tip
  let tip = [w / 2, 0];
  for (const [x, z] of shown.flat()) { const p = mapPx(x, z); if (p[1] < tip[1] || tip[1] === 0) tip = p; }
  const ui = document.getElementById('gameui').style;
  ui.setProperty('--map-w', `${w}px`); ui.setProperty('--map-tip', `${(w - tip[0]).toFixed(1)}px`);
  const dpr = Math.min(devicePixelRatio, 2);
  el.width = Math.round(w * dpr); el.height = Math.round(h * dpr);
  const base = document.createElement('canvas');
  base.width = el.width; base.height = el.height;
  const c = base.getContext('2d');
  c.scale(dpr, dpr);
  const path = (ring) => { ring.forEach(([x, z], i) => { const [px, py] = mapPx(x, z); if (i) c.lineTo(px, py); else c.moveTo(px, py); }); c.closePath(); };
  c.beginPath(); for (const r of shown) path(r);
  c.fillStyle = 'rgba(255,255,255,.42)'; c.fill();
  minimap.base = base;
}
function drawMinimap() {
  const el = minimap.el;
  if (!H?.real) return;
  if (!minimap.base || el.clientHeight !== minimap.h) buildMinimap();
  if (!minimap.base) return;
  const c = el.getContext('2d');
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, el.width, el.height); // the base is transparent: without this every arrow stays
  c.drawImage(minimap.base, 0, 0);
  c.scale(el.width / minimap.w, el.width / minimap.w);
  flockHooks.mapOverlay?.(c, mapPx, minimap.w, minimap.h); // the other condors, under ours
  const [px, py] = mapPx(condor.pos.x / H.upk, H.zKm(condor.pos.z));
  // the heading: -z is north in the strip, south in its mirrored copies
  const t = (((condor.pos.z / H.L) % 2) + 2) % 2, south = t <= 1 ? 1 : -1;
  const dx = -Math.sin(condor.yaw), dy = -Math.cos(condor.yaw) * south;
  // an arrowhead pointing where the bird flies, with a dark edge so it reads on the white
  const nx = -dy, ny = dx;
  c.shadowColor = 'rgba(238,43,43,.9)'; c.shadowBlur = 7;
  c.fillStyle = '#EE2B2B'; c.strokeStyle = 'rgba(0,0,0,.7)'; c.lineWidth = 1; c.lineJoin = 'round';
  c.beginPath();
  c.moveTo(px + dx * 7, py + dy * 7);
  c.lineTo(px - dx * 4 + nx * 4.5, py - dy * 4 + ny * 4.5);
  c.lineTo(px - dx * 1.5, py - dy * 1.5);
  c.lineTo(px - dx * 4 - nx * 4.5, py - dy * 4 - ny * 4.5);
  c.closePath(); c.fill(); c.shadowBlur = 0; c.stroke();
}
minimap.el.addEventListener('pointerdown', (e) => {
  if (mode !== 'game' || !minimap.base) return;
  const r = minimap.el.getBoundingClientRect();
  const { kmX, kmZ } = mapKm(e.clientX - r.left, e.clientY - r.top);
  teleport(kmX, kmZ);
});

// ---------------------------------------------------------------- search: a city or a summit, then fly there
// The magnifying glass in the corner opens a panel: every populated place (the index) and every
// named summit (peaks.json, fetched the first time), fuzzy-matched as you type; Enter or a click
// teleports. While the input has focus the flight keys are off (isTyping).
const search = {
  btn: document.getElementById('search-btn'), panel: document.getElementById('search'),
  input: document.getElementById('search-input'), list: document.getElementById('search-results'),
  items: null, results: [], active: 0,
};
async function searchItems() {
  if (!search.items) {
    const [summits, lakes] = H?.real ? await Promise.all([real.loadSummits(), real.loadLakes()]) : [[], []];
    const cities = real.cities.map((c) => ({ name: c.name, kind: 'ciudad', sub: c.pop >= 1000 ? `${Math.round(c.pop / 1000)} k hab.` : `${c.pop} hab.`, kmX: c.kmX, kmZ: c.kmZ }));
    const peaks = summits.map((p) => ({ name: p.name, kind: 'cumbre', sub: `${p.ele} m`, kmX: p.kmX, kmZ: p.kmZ }));
    const water = lakes.map((l) => ({ name: l.name, kind: /embalse|tranque|represa/i.test(l.name) ? 'embalse' : 'lago', sub: `${l.areaKm2 >= 10 ? l.areaKm2.toFixed(0) : l.areaKm2.toFixed(1)} km² · ${l.level} m`, kmX: l.kmX, kmZ: l.kmZ }));
    search.items = [...cities, ...peaks, ...water].map((it) => ({ ...it, key: fold(it.name) }));
  }
  return search.items;
}
function openSearch() {
  if (mode !== 'game') return;
  search.panel.hidden = false; search.btn.classList.add('open');
  search.input.value = ''; renderResults([], '');
  search.input.focus();
  searchItems().then(runSearch);
}
function closeSearch(refocus = true) {
  if (search.panel.hidden) return;
  search.panel.hidden = true; search.btn.classList.remove('open');
  if (refocus) document.getElementById('exit').focus?.({ preventScroll: true });
}
function runSearch() {
  if (!search.items) return;
  const q = search.input.value.trim();
  search.results = q ? fuzzySearch(q, search.items, 8) : [];
  search.active = 0;
  renderResults(search.results, q);
}
function renderResults(results, q) {
  const list = search.list;
  list.textContent = '';
  if (!results.length) {
    if (q) { const li = document.createElement('li'); li.className = 'empty'; li.textContent = 'Sin resultados'; list.append(li); }
    return;
  }
  results.forEach(({ item, match }, i) => {
    const li = document.createElement('li');
    li.className = i === search.active ? 'active' : '';
    li.setAttribute('role', 'option');
    const b = document.createElement('b');
    // the matched letters in red (names come from the map data: built from text nodes, never markup)
    const hit = new Set(match.indices);
    let run = '', runHit = false;
    const flush = () => { if (!run) return; const el = runHit ? document.createElement('mark') : document.createTextNode(run); if (runHit) el.textContent = run; b.append(el); run = ''; };
    [...item.name].forEach((ch, k) => { const h = hit.has(k); if (h !== runHit) { flush(); runHit = h; } run += ch; });
    flush();
    const span = document.createElement('span'); span.textContent = `${item.kind} · ${item.sub}`;
    li.append(b, span);
    li.addEventListener('pointerdown', (e) => { e.preventDefault(); pickResult(item); });
    li.addEventListener('pointerenter', () => { search.active = i; for (const el of list.children) el.classList.toggle('active', el === li); });
    list.append(li);
  });
}
function pickResult(item) {
  closeSearch();
  teleport(item.kmX, item.kmZ, item.name);
}
search.btn.addEventListener('click', () => (search.panel.hidden ? openSearch() : closeSearch()));
search.input.addEventListener('input', runSearch);
search.input.addEventListener('keydown', (e) => {
  e.stopPropagation();
  const n = search.results.length;
  if (e.key === 'Escape') { e.preventDefault(); closeSearch(); }
  else if (e.key === 'ArrowDown' && n) { e.preventDefault(); search.active = (search.active + 1) % n; renderResults(search.results, search.input.value.trim()); }
  else if (e.key === 'ArrowUp' && n) { e.preventDefault(); search.active = (search.active + n - 1) % n; renderResults(search.results, search.input.value.trim()); }
  else if (e.key === 'Enter' && n) { e.preventDefault(); pickResult(search.results[search.active].item); }
});
// a click elsewhere (the scene grabs focus on pointerdown) closes the panel
search.input.addEventListener('blur', () => setTimeout(() => { if (!search.panel.contains(document.activeElement)) closeSearch(false); }, 0));

const hud = document.getElementById('hud');
const clock = new THREE.Clock();
let hudTick = 0, fpsAcc = 0, fpsN = 0;
let ambientAcc = 0;
function frame() {
  requestAnimationFrame(frame);
  const ambient = mode !== 'game';
  // paused while the hero is scrolled away (the tab being hidden already stops rAF)
  if (ambient && !heroVisible) { clock.getDelta(); return; }
  let dt = Math.min(clock.getDelta(), 0.1);
  if (ambient) { // frame-rate cap for the background
    ambientAcc += dt;
    if (ambientAcc < 1 / P.ambientFps) return;
    dt = Math.min(ambientAcc, 0.1); ambientAcc = 0;
  }
  skyUniforms.uTime.value += dt;
  seaUniforms.uTime.value += dt * P.waveSpeed;
  adaptQuality(dt, revealed);
  updateCamera(dt);
  window.condorFlock?.frame(dt);
  streamTiles();
  lastPending = updateChunks(ambient ? 3 : 6, P.viewDistance);
  updateFades(dt);
  updateSea();
  updatePeakLabels();
  if (!ambient) drawMinimap();
  sky.position.copy(camera.position);
  bloomPass.strength = ambient ? P.ambientBloom : P.bloomStrength;
  if (P.bloom) composer.render(); else renderer.render(scene, camera);
  if (!revealed) {
    revealed = true; performance.mark('boot:frame');
    requestAnimationFrame(() => renderer.domElement.classList.add('ready'));
    // once the fade is over, ramp to the device's tier: the wider ring builds under the current fog
    if (quality.target > quality.tier) setTimeout(() => { if (P.quality === 'auto' || Number(P.quality) === quality.target) setTier(quality.target); }, 1500);
  }
  fpsAcc += dt; fpsN++;
  if ((hudTick++ & 15) === 0) {
    const p = focus, fps = fpsN / Math.max(fpsAcc, 1e-3); fpsAcc = 0; fpsN = 0;
    const spd = P.cameraMode === 'condor' ? P.flightSpeed : P.flySpeed;
    const src = H?.real ? `tiles ${real.tiles.size} · ${(real.bytes / 1024).toFixed(0)} KB · ${QUALITY[quality.tier].name}${P.quality === 'auto' ? ' auto' : ''}` : `seed ${P.seed}`;
    const hdg = H?.real ? `rumbo ${String(Math.round(((((-condor.yaw * 180) / Math.PI) % 360) + 360) % 360)).padStart(3, '0')}°  ·  ` : '';
    hud.textContent = `${hdg}pos ${p.x.toFixed(0)}, ${p.y.toFixed(0)}, ${p.z.toFixed(0)}  ·  speed ${spd.toFixed(0)}  ·  ${src}  ·  ${fps.toFixed(0)} fps`;
  }
}
frame();
}
