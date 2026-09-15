import { Head } from '@inertiajs/react';
import { RED } from '@/brand/kit';
import { Wireframe } from '@/components/brand/wireframe';
import type { LumaCoverShow } from '@/types';

// Like /opengraph: screenshot the stage itself to exclude the outline and instructions.
// 1400 × 400 is exactly 3.5:1; a 2× capture produces a 2800 × 800 cover.
const FRAME = 24;

export default function Show({ title, width, height, dates, site }: LumaCoverShow) {
  return (
    <div className="min-h-screen bg-black text-white">
      <Head><title>{title}</title></Head>
      <div
        data-testid="luma-cover"
        aria-label="Portada Luma de Chile Tech Week 2026"
        className="relative overflow-hidden bg-black"
        style={{ width, height, margin: FRAME, outline: '1px solid #525252', outlineOffset: 0 }}
      >
        <Wireframe
          width={1600}
          height={600}
          seed={7}
          cols={40}
          rows={16}
          horizon={0.45}
          amplitude={1}
          steep={1}
          coast={0.5}
          strokeColor={RED}
          preserveAspectRatio="xMidYMin meet"
          className="absolute opacity-55"
          style={{ width: width * 1.3, height: width * 1.3 * 600 / 1600, left: -width * 0.15, top: height * 0.92 - width * 1.3 * 600 / 1600 * 0.45 }}
        />
        <div className="relative flex h-full items-center justify-center gap-[140px]">
          <img
            src="/brand/logo-transparent.svg"
            alt="Chile Tech Week 2026"
            width={440}
            height={408}
            className="block h-[300px] w-auto shrink-0"
          />
          <div className="flex flex-col gap-6 font-(family-name:--mono) uppercase">
            <div className="text-[72px] leading-[1.1] font-bold tracking-[0.04em] whitespace-nowrap">{dates}</div>
            <div className="text-[22px] tracking-[0.22em] text-(--gray)">{site}</div>
          </div>
        </div>
      </div>
      <p className="label m-0 px-6 py-3 text-(--gray)">
        {width} × {height} · 3,5:1 · captura lo que queda dentro del marco
      </p>
    </div>
  );
}
