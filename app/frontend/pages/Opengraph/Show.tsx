import { Head } from '@inertiajs/react';
import { RED } from '@/brand/kit';
import { Wireframe } from '@/components/brand/wireframe';
import type { OpengraphShow } from '@/types';

// /opengraph: the share image as a page. The stage is exactly width × height, framed by a
// 1px outline drawn outside it, FRAME px from the page's top-left corner: select the inside of
// the frame for a screenshot, or clip at (FRAME, FRAME) with the stage's size headlessly.
//
// The logo is the brand's static SVG (paths, no font to wait for); the copy is Space Mono; the
// relief runs along the bottom as red lines.
const FRAME = 24;

// The mesh's placement: 1.3× the stage's width, centred, with its horizon line 91% down the
// stage; everything nearer than that is outside the image.
const WIRE = { scale: 1.3, aspect: 600 / 1600, horizon: 0.45, at: 0.91 };
function wireBox(width: number, height: number) {
  const w = width * WIRE.scale;
  const h = w * WIRE.aspect;
  const top = height * WIRE.at - h * WIRE.horizon;
  return { width: w, height: h, left: (width - w) / 2, top };
}

export default function Show({ title, width, height, dates, site }: OpengraphShow) {
  return (
    <div className="min-h-screen bg-black text-white">
      <Head>
        <title>{title}</title>
      </Head>

      {/* the frame is an outline: outside the box, so a capture of the box never includes it */}
      <div
        className="relative overflow-hidden bg-black"
        style={{ width, height, margin: FRAME, outline: '1px solid #525252', outlineOffset: 0 }}
      >
        {/* the relief as red lines, far away: the mesh is wider than the stage (its far rows
            narrow towards the centre) and its near rows fall below the edge, so only the
            distant cordillera shows, flat under the logo and rising from the centre to the right */}
        <Wireframe
          width={1600}
          height={600}
          seed={7}
          cols={40}
          rows={16}
          horizon={WIRE.horizon}
          amplitude={1}
          steep={1}
          coast={0.5}
          strokeColor={RED}
          preserveAspectRatio="xMidYMin meet"
          className="absolute opacity-55"
          style={wireBox(width, height)}
        />
        <div className="relative flex h-full items-center justify-center gap-20 pl-[40px]">
          <img
            src="/brand/logo-transparent.svg"
            alt="Chile Tech Week 2026"
            width={440}
            height={408}
            className="block h-[430px] w-auto shrink-0"
          />
          <div className="flex flex-col gap-6 font-(family-name:--mono) uppercase">
            <div className="text-[68px] leading-[1.1] font-bold tracking-[0.04em] whitespace-nowrap">{dates}</div>
            <div className="mt-2 text-[22px] tracking-[0.22em] text-(--gray)">{site}</div>
          </div>
        </div>
      </div>

      <p className="label m-0 px-6 py-3 text-(--gray)">
        {width} × {height} · captura lo que queda dentro del marco
      </p>
    </div>
  );
}
