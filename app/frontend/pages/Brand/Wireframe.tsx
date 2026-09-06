import { usePage } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import { toSvg, type WireOptions } from '@/brand/mesh';
import { BrandFrame, Chip, SURFACE, Section, Seg, saveBlob, useCopy } from '@/components/brand/frame';
import { Wireframe } from '@/components/brand/wireframe';
import type { BrandWireframe } from '@/types';

// /brand/wireframe-gen: the low-poly relief as downloadable assets. A few bounded choices —
// format, style, ink, background, relief, seed — so nothing leaves the brand; the settings
// travel in the query string, so a result can be shared as a link.

type FormatId = 'wide' | 'strip' | 'social' | 'square' | 'story' | 'tile';
type Format = { id: FormatId; name: string; use: string; opts: WireOptions };
const FORMATS: Format[] = [
  { id: 'wide', name: 'Ancho', use: 'Fondo de hero, banner, cabecera de mail', opts: { width: 1600, height: 600, cols: 34, rows: 16, horizon: 0.4, amplitude: 0.55 } },
  { id: 'strip', name: 'Franja', use: 'Divisor de sección, pie, ticket', opts: { width: 1600, height: 220, cols: 40, rows: 8, horizon: 0.25, amplitude: 0.85 } },
  { id: 'social', name: 'Social', use: 'Imagen para redes y OG, 1200 × 630', opts: { width: 1200, height: 630, cols: 30, rows: 14, horizon: 0.4, amplitude: 0.55 } },
  { id: 'story', name: 'Historia', use: 'Vertical, 1080 × 1920', opts: { width: 1080, height: 1920, cols: 22, rows: 20, horizon: 0.6, amplitude: 0.28 } },
  { id: 'square', name: 'Cuadrado', use: 'Avatar, sticker, tarjeta', opts: { width: 800, height: 800, cols: 9, rows: 9, horizon: 0.28, amplitude: 0.55 } },
  { id: 'tile', name: 'Mosaico', use: 'Plano triangulado para tarjetas y patrones', opts: { width: 800, height: 800, cols: 6, rows: 6, mode: 'flat' } },
];

type StyleId = 'lines' | 'sheets';
const STYLES: { id: StyleId; name: string }[] = [
  { id: 'lines', name: 'Líneas' },
  { id: 'sheets', name: 'Láminas' },
];

type InkId = 'red' | 'white' | 'gray';
const INKS: { id: InkId; name: string; hex: string }[] = [
  { id: 'red', name: 'Rojo', hex: '#EE2B2B' },
  { id: 'white', name: 'Blanco', hex: '#FFFFFF' },
  { id: 'gray', name: 'Gris', hex: '#525252' },
];

type BgId = 'black' | 'transparent' | 'none';
const BGS: { id: BgId; name: string; use: string }[] = [
  { id: 'black', name: 'Negro', use: 'con su fondo' },
  { id: 'transparent', name: 'Transparente', use: 'caras negras, para fondos oscuros' },
  { id: 'none', name: 'Solo líneas', use: 'sin caras, para cualquier fondo' },
];

type ReliefId = 'soft' | 'andes' | 'steep';
const RELIEFS: { id: ReliefId; name: string; steep: number }[] = [
  { id: 'soft', name: 'Suave', steep: 0.15 },
  { id: 'andes', name: 'Andes', steep: 0.5 },
  { id: 'steep', name: 'Escarpado', steep: 0.9 },
];

type Params = { f: FormatId; style: StyleId; ink: InkId; bg: BgId; relief: ReliefId; seed: number };
const DEFAULTS: Params = { f: 'wide', style: 'lines', ink: 'red', bg: 'black', relief: 'andes', seed: 7 };

const pick = <T extends string>(value: string | null, ids: readonly T[], fallback: T): T =>
  ids.includes(value as T) ? (value as T) : fallback;

function parse(url: string): Params {
  const q = new URLSearchParams(url.split('?')[1] ?? '');
  const seed = Number.parseInt(q.get('seed') ?? '', 10);
  return {
    f: pick(q.get('f'), FORMATS.map((x) => x.id), DEFAULTS.f),
    style: pick(q.get('style'), STYLES.map((x) => x.id), DEFAULTS.style),
    ink: pick(q.get('ink'), INKS.map((x) => x.id), DEFAULTS.ink),
    bg: pick(q.get('bg'), BGS.map((x) => x.id), DEFAULTS.bg),
    relief: pick(q.get('relief'), RELIEFS.map((x) => x.id), DEFAULTS.relief),
    seed: Number.isFinite(seed) && seed >= 0 && seed <= 9999 ? seed : DEFAULTS.seed,
  };
}

const query = (p: Params) => new URLSearchParams(Object.entries(p).map(([k, v]) => [k, String(v)])).toString();

/** The generator's options for a set of parameters: what the preview draws and toSvg writes. */
function optionsOf(p: Params): WireOptions {
  const format = FORMATS.find((x) => x.id === p.f) ?? FORMATS[0];
  const sheets = p.style === 'sheets';
  return {
    ...format.opts,
    seed: p.seed,
    steep: RELIEFS.find((x) => x.id === p.relief)?.steep,
    strokeColor: INKS.find((x) => x.id === p.ink)?.hex,
    fillMode: p.style,
    background: p.bg === 'black' ? '#000000' : null,
    fill: '#000000',
    occlude: sheets || p.bg !== 'none',
  };
}

const fileName = (p: Params, ext: string) => `ctw26-wireframe-${p.f}-${p.style}-${p.ink}-${p.seed}.${ext}`;

/** Rasterises the SVG through the browser: same drawing, 2× the format's size, capped at 4096 px. */
async function pngOf(svg: string, width: number, height: number): Promise<Blob> {
  const scale = Math.min(2, 4096 / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('svg did not load'));
      img.src = url;
    });
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
  } finally {
    URL.revokeObjectURL(url);
  }
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('png failed'))), 'image/png'),
  );
}

export default function WireframeGen({ title, description }: BrandWireframe) {
  const [params, setParams] = useState<Params>(() => parse(usePage().url));
  const [busy, setBusy] = useState(false);
  const { copied, copy } = useCopy();
  const set = (patch: Partial<Params>) => setParams((p) => ({ ...p, ...patch }));

  // the settings live in the URL, so a result is a link
  useEffect(() => {
    window.history.replaceState(window.history.state, '', `${window.location.pathname}?${query(params)}`);
  }, [params]);

  const format = FORMATS.find((x) => x.id === params.f) ?? FORMATS[0];
  const options = useMemo(() => optionsOf(params), [params]);
  const sheets = params.style === 'sheets';
  // sheets have no faces to leave out: the lines-only background makes no sense there
  const bg = sheets && params.bg === 'none' ? 'transparent' : params.bg;

  const downloadSvg = () => saveBlob(new Blob([toSvg({ ...options, background: bg === 'black' ? '#000000' : null })], { type: 'image/svg+xml' }), fileName(params, 'svg'));
  const downloadPng = async () => {
    setBusy(true);
    try {
      const svg = toSvg({ ...options, background: bg === 'black' ? '#000000' : null });
      saveBlob(await pngOf(svg, format.opts.width, format.opts.height), fileName(params, 'png'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <BrandFrame title={title} description={description}>
      <Section
        level="h1"
        eyebrow="Marca · Wireframe"
        heading="Generador de wireframe"
        lede="Elige formato, estilo, tinta, fondo y relieve, cambia la semilla hasta que la cordillera te guste y descarga en SVG o PNG."
      >
        <div className="grid gap-10 lg:grid-cols-[1fr_300px]">
          <div className="flex flex-col gap-3">
            <div
              className={`relative w-full overflow-hidden rounded-[2px] border border-(--line) ${bg === 'black' ? SURFACE.black : SURFACE.checker}`}
              style={{ aspectRatio: `${format.opts.width} / ${format.opts.height}`, width: `min(100%, calc(70vh * ${format.opts.width / format.opts.height}))`, marginInline: 'auto' }}
            >
              <Wireframe
                {...options}
                background={bg === 'black' ? '#000000' : null}
                occlude={sheets || bg !== 'none'}
                preserveAspectRatio="xMidYMid meet"
                className="absolute inset-0 h-full w-full"
              />
            </div>
            <div className="label flex flex-wrap justify-between gap-x-6 gap-y-1 text-(--gray)">
              <span>
                {format.opts.width} × {format.opts.height} · {format.use}
              </span>
              <span>semilla {params.seed}</span>
            </div>
          </div>

          <div className="flex flex-col gap-7">
            <Seg label="Formato" value={params.f} items={FORMATS} onChange={(f) => set({ f })} />
            <Seg label="Estilo" value={params.style} items={STYLES} onChange={(style) => set({ style })} />
            <Seg label="Tinta" value={params.ink} items={INKS} onChange={(ink) => set({ ink })} />
            <Seg
              label="Fondo"
              value={bg}
              items={BGS.map((b) => ({ ...b, disabled: sheets && b.id === 'none' }))}
              onChange={(bg) => set({ bg })}
            />
            <Seg label="Relieve" value={params.relief} items={RELIEFS} onChange={(relief) => set({ relief })} />

            <div className="flex flex-col gap-2">
              <label className="label text-(--gray)" htmlFor="seed">
                Semilla
              </label>
              <div className="flex gap-1.5">
                <input
                  id="seed"
                  type="number"
                  min={0}
                  max={9999}
                  value={params.seed}
                  onChange={(e) => set({ seed: Math.max(0, Math.min(9999, Number.parseInt(e.target.value, 10) || 0)) })}
                  className="w-24 rounded-[2px] border border-(--line) bg-transparent px-3 py-1.5 font-(family-name:--mono) text-[12px] text-white outline-none focus:border-(--gray)"
                />
                <Chip onClick={() => set({ seed: Math.floor(Math.random() * 10000) })}>Otra</Chip>
                <Chip onClick={() => set({ seed: params.seed + 1 })}>+1</Chip>
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t border-(--line) pt-6">
              <div className="label text-(--gray)">Descargar</div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn primary" onClick={downloadPng} disabled={busy}>
                  {busy ? 'Generando…' : 'PNG · 2×'}
                </button>
                <button type="button" className="btn" onClick={downloadSvg}>
                  SVG
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => copy('svg', toSvg({ ...options, background: bg === 'black' ? '#000000' : null }))}
                >
                  {copied === 'svg' ? 'Copiado' : 'Copiar SVG'}
                </button>
              </div>
              <p className="mt-2 mb-0 text-[13px] leading-[1.5] text-(--gray)">
                SVG: líneas de 1 unidad, escala a cualquier tamaño. PNG: el doble del formato.
              </p>
            </div>
          </div>
        </div>
      </Section>
    </BrandFrame>
  );
}
