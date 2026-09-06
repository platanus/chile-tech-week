import { COLORS, FONTS, FONTS_LINK, MARKS, RED, VARIANTS, markDownload, markFile, type Mark } from '@/brand/kit';
import { BrandFrame, Chip, SURFACE, Section, useCopy } from '@/components/brand/frame';
import { Wireframe } from '@/components/brand/wireframe';
import { brand_icon_path, brand_wireframe_path } from '@/routes';
import type { BrandShow } from '@/types';

// /brand: the 2026 brand kit. The marks (public/brand, built by npm run brand:marks) in
// their three variants, the type, the colours, the wireframe and how to use it all. Content
// in app/frontend/brand/kit.ts.

function MarkCard({ mark }: { mark: Mark }) {
  const main = VARIANTS[0];
  return (
    <div className="flex flex-col gap-6 border-t border-(--line) pt-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-(family-name:--display) m-0 text-[20px] font-extrabold tracking-[-0.02em] uppercase">{mark.name}</h3>
          <p className="mt-2 mb-0 truncate text-[15px] leading-[1.5] text-(--gray)">{mark.use}</p>
        </div>
        {mark.id === 'icon' && (
          <a href={brand_icon_path()} className="label text-(--red) no-underline hover:text-white">
            Ver a tamaño de favicon →
          </a>
        )}
      </div>

      <div
        className={`flex items-center justify-center rounded-[2px] border border-(--line) p-[6%] ${SURFACE[main.surface]}`}
        style={{ aspectRatio: mark.aspect > 3 ? '4 / 1' : '1 / 1' }}
      >
        <img
          src={markFile(mark, main, 'svg')}
          alt={`${mark.name} Chile Tech Week 2026`}
          className="block max-h-full max-w-full"
          style={{ width: mark.aspect > 3 ? '100%' : mark.aspect === 1 ? '65%' : '78%' }}
        />
      </div>

      <dl className="m-0 grid grid-cols-[auto_1fr_auto] items-center gap-x-5 gap-y-3">
        {VARIANTS.map((variant) => (
          <div key={variant.id} className="contents">
            <dt className={`flex size-14 items-center justify-center rounded-[2px] border border-(--line) p-2 ${SURFACE[variant.surface]}`}>
              <img src={markFile(mark, variant, 'svg')} alt="" className="block max-h-full max-w-full" />
            </dt>
            <dd className="m-0">
              <div className="font-(family-name:--mono) text-[12px] tracking-[0.06em] uppercase">{variant.name}</div>
              <div className="text-[13px] text-(--gray)">{variant.use}</div>
            </dd>
            <dd className="m-0 flex gap-1.5">
              <a className="btn !px-3 !py-2" href={markFile(mark, variant, 'svg')} download={markDownload(mark, variant, 'svg')}>
                SVG
              </a>
              <a className="btn !px-3 !py-2" href={markFile(mark, variant, 'png')} download={markDownload(mark, variant, 'png')}>
                PNG
              </a>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

const SPECIMEN: Record<string, React.ReactNode> = {
  Unbounded: <span className="text-[clamp(28px,4vw,56px)] leading-[0.95] font-extrabold tracking-[-0.03em] uppercase">Chile Tech Week</span>,
  Syne: (
    <span className="text-[clamp(18px,1.8vw,24px)] leading-[1.4]">
      Una semana. Cientos de eventos. <b className="font-semibold">Toda la comunidad tech de Chile.</b>
    </span>
  ),
  'Space Mono': <span className="text-[13px] tracking-[0.22em] uppercase">Santiago · 16 al 22 de noviembre · #CTW2026</span>,
};

export default function Show({ title, description }: BrandShow) {
  const { copied, copy } = useCopy();

  return (
    <BrandFrame title={title} description={description}>
      <Section
        level="h1"
        eyebrow="Marca · 2026"
        heading="Kit de marca"
        lede="Logos, ícono, tipografías, colores y wireframe de Chile Tech Week 2026, listos para descargar."
      >
        <nav className="label flex flex-wrap gap-x-6 gap-y-2">
          {[
            ['#logos', 'Logos'],
            ['#animacion', 'Animado'],
            ['#tipografia', 'Tipografía'],
            ['#colores', 'Colores'],
            ['#wireframe', 'Wireframe'],
            ['#uso', 'Uso'],
          ].map(([href, name]) => (
            <a key={href} href={href} className="text-(--gray) no-underline hover:text-white">
              {name}
            </a>
          ))}
        </nav>
      </Section>

      <Section
        id="logos"
        eyebrow="01 · Logos"
        heading="Los logos"
        lede="Cada uno en tres variantes. Los SVG son trazados: no necesitan la fuente y escalan a cualquier tamaño."
      >
        <div className="grid gap-12 md:grid-cols-2">
          {MARKS.map((mark) => (
            <div key={mark.id} className={mark.id === 'logo-horizontal' ? 'md:col-span-2' : ''}>
              <MarkCard mark={mark} />
            </div>
          ))}
        </div>
      </Section>

      <Section
        id="animacion"
        eyebrow="01b · Logo animado"
        heading="El logo en movimiento"
        lede="La animación de la landing: los trazos se dibujan y el relleno cae. GIF para donde no hay video, MP4 para presentaciones y redes."
      >
        <div className="grid gap-8 md:grid-cols-[minmax(0,420px)_1fr] md:items-end">
          <img
            src="/brand/logo-animation.gif"
            alt="Logo Chile Tech Week 2026 animado: los trazos se dibujan y el relleno cae"
            width={900}
            height={890}
            className="block h-auto w-full rounded-[2px] border border-(--line) bg-black"
          />
          <div className="flex flex-col gap-3">
            <div className="label text-(--gray)">Descargar</div>
            <div className="flex flex-wrap gap-2">
              <a className="btn primary" href="/brand/logo-animation.gif" download="chile-tech-week-2026-logo.gif">
                GIF · 900 px
              </a>
              <a className="btn" href="/brand/logo-animation.mp4" download="chile-tech-week-2026-logo.mp4">
                MP4 · 1080 px
              </a>
            </div>
            <p className="mt-2 mb-0 max-w-[40ch] text-[14px] leading-[1.5] text-(--gray)">
              Sobre negro, 30 fps, en bucle. Si el fondo no es negro, mejor el logo fijo.
            </p>
          </div>
        </div>
      </Section>

      <Section
        id="tipografia"
        eyebrow="02 · Tipografía"
        heading="Tres familias"
        lede="Las tres son libres, en Google Fonts."
      >
        <div className="grid gap-px border border-(--line) bg-(--line) md:grid-cols-3">
          {FONTS.map((font) => (
            <div key={font.family} className="flex flex-col gap-6 bg-black p-6">
              <div className="flex min-h-[120px] items-center md:h-[176px]" style={{ fontFamily: `var(${font.cssVar})` }}>
                {SPECIMEN[font.family]}
              </div>
              <div className="flex flex-col gap-1">
                <div className="label text-(--red)">{font.role}</div>
                <div className="font-(family-name:--display) text-[20px] font-extrabold tracking-[-0.02em]">{font.family}</div>
                <div className="font-(family-name:--mono) text-[12px] text-(--gray)">{font.weights}</div>
                <p className="mt-2 mb-0 text-[14px] leading-[1.5] text-(--gray)">{font.use}</p>
              </div>
              <a className="btn mt-auto self-start" href={font.url} target="_blank" rel="noreferrer">
                Descargar en Google Fonts
              </a>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-3">
          <div className="label text-(--gray)">El &lt;link&gt; que carga el sitio</div>
          <div className="flex flex-wrap items-center gap-3">
            <code className="min-w-0 flex-1 overflow-x-auto rounded-[2px] border border-(--line) px-4 py-3 font-(family-name:--mono) text-[12px] whitespace-nowrap text-(--gray)">
              {FONTS_LINK}
            </code>
            <Chip active={copied === 'link'} onClick={() => copy('link', FONTS_LINK)}>
              {copied === 'link' ? 'Copiado' : 'Copiar'}
            </Chip>
          </div>
        </div>
      </Section>

      <Section
        id="colores"
        eyebrow="03 · Colores"
        heading="Negro, blanco y un rojo"
        lede="Clic en un color para copiar su hex."
      >
        <div className="grid gap-px border border-(--line) bg-(--line) sm:grid-cols-2 lg:grid-cols-3">
          {COLORS.map((color) => (
            <button
              key={color.hex}
              type="button"
              onClick={() => copy(color.hex, color.hex)}
              className="flex w-full cursor-pointer flex-col items-stretch gap-5 border-0 bg-black p-0 text-left text-white"
              style={{ font: 'inherit' }}
            >
              <div
                className="box-border flex h-32 w-full items-end justify-between gap-4 px-4 py-3 font-(family-name:--mono) text-[12px] tracking-[0.14em] uppercase"
                style={{ background: color.hex, color: color.ink === 'white' ? '#fff' : '#000' }}
              >
                <span>{color.name}</span>
                <span>{copied === color.hex ? 'Copiado' : color.hex}</span>
              </div>
              <div className="px-4 pb-5 text-[14px] leading-[1.5] text-(--gray)">{color.use}</div>
            </button>
          ))}
        </div>
      </Section>

      <Section
        id="wireframe"
        eyebrow="04 · Wireframe"
        heading="El relieve"
        lede="El relieve de la landing, aplanado a líneas. Para fondos, franjas y tarjetas, en SVG y PNG."
      >
        <div className="relative overflow-hidden rounded-[2px] border border-(--line) bg-black" style={{ aspectRatio: '16 / 6' }}>
          <Wireframe
            width={1600}
            height={600}
            seed={7}
            cols={34}
            rows={16}
            horizon={0.4}
            amplitude={0.55}
            strokeColor={RED}
            className="absolute inset-0 h-full w-full"
          />
        </div>
        <a className="btn primary self-start" href={brand_wireframe_path()}>
          Generar assets
        </a>
      </Section>

      <Section id="uso" eyebrow="05 · Uso" heading="Cómo usarla">
        <ul className="m-0 grid list-none gap-px border border-(--line) bg-(--line) p-0 md:grid-cols-2">
          {[
            ['Nombre', 'Chile Tech Week 2026. En corto, CLTW26.'],
            ['Logos', 'Sin redibujar, estirar ni recolorear. El 20 hueco, el 26 rojo.'],
            ['Espacio y tamaño', 'Alrededor, la altura de una letra libre. Mínimos: logo 80 px, horizontal 200 px, ícono 32 px.'],
            ['Fondos', 'Negro por defecto. Transparente sobre foto o color, clara sobre blanco.'],
          ].map(([name, text]) => (
            <li key={name} className="flex flex-col gap-2 bg-black p-6">
              <div className="label text-(--red)">{name}</div>
              <div className="text-[15px] leading-[1.5] text-(--gray)">{text}</div>
            </li>
          ))}
        </ul>
      </Section>
    </BrandFrame>
  );
}
