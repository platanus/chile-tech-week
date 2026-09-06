import { BrandFrame, Section } from '@/components/brand/frame';
import { brand_path } from '@/routes';
import type { BrandIcon } from '@/types';

// The favicon sizes the icon will be processed into, previewed from the PNG the way a
// browser tab or a calendar would shrink it.
const SMALL = [128, 64, 32, 16];

// /brand/icon: the 2026 icon (public/brand, built by npm run brand:marks), previewed at its
// real sizes and downloadable as PNG and SVG. The other variants are on /brand.
export default function Icon({ title, description, size, svgPath, pngPath, downloadName }: BrandIcon) {
  return (
    <BrandFrame title={title} description={description}>
      <Section
        level="h1"
        eyebrow="Ícono · 2026"
        heading="CLTW 2026"
        lede="Favicon, foto de perfil y la imagen de los eventos en los calendarios."
      >
        <div className="flex flex-wrap items-start gap-12">
          <figure className="m-0 flex flex-col gap-3">
            <img
              src={svgPath}
              alt="Ícono Chile Tech Week 2026: CLTW sobre 2026"
              width={size}
              height={size}
              className="block h-auto w-[min(72vw,420px)] rounded-[2px] border border-(--line)"
            />
            <figcaption className="label text-(--gray)">
              {size} × {size} · svg y png
            </figcaption>
          </figure>

          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-3">
              <div className="label text-(--gray)">A tamaño de favicon</div>
              <div className="flex flex-wrap items-end gap-6">
                {SMALL.map((px) => (
                  <figure key={px} className="m-0 flex flex-col items-center gap-2">
                    <img src={pngPath} alt="" width={px} height={px} className="block rounded-[2px] border border-(--line)" />
                    <figcaption className="font-(family-name:--mono) text-[11px] text-(--gray)">{px}</figcaption>
                  </figure>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="label text-(--gray)">Descargar</div>
              <div className="flex flex-wrap gap-2.5">
                <a className="btn primary" href={pngPath} download={`${downloadName}.png`}>
                  PNG · {size} px
                </a>
                <a className="btn" href={svgPath} download={`${downloadName}.svg`}>
                  SVG
                </a>
              </div>
              <a href={`${brand_path()}#logos`} className="label text-(--red) no-underline hover:text-white">
                Transparente y sobre blanco, en el kit →
              </a>
            </div>

            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 font-(family-name:--mono) text-[12px] tracking-[0.06em] text-(--gray)">
              <dt className="uppercase">Tipografía</dt>
              <dd className="m-0 text-white">Unbounded 800, trazado a curvas</dd>
              <dt className="uppercase">Colores</dt>
              <dd className="m-0 text-white">#000000 · #FFFFFF · #EE2B2B</dd>
              <dt className="uppercase">Fondo</dt>
              <dd className="m-0 text-white">Negro, sin transparencia</dd>
            </dl>
          </div>
        </div>
      </Section>
    </BrandFrame>
  );
}
