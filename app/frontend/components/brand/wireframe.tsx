import { type CSSProperties, useMemo } from 'react';
import { BRAND_RED, buildMesh, type WireOptions } from '@/brand/mesh';

type Props = WireOptions & { className?: string; style?: CSSProperties; preserveAspectRatio?: string };

/** The wireframe drawn inline, exactly as toSvg would write it; strokes stay hairlines at any size. */
export function Wireframe({ className, style, preserveAspectRatio = 'xMidYMid slice', ...o }: Props) {
  const key = JSON.stringify(o);
  const mesh = useMemo(() => buildMesh(o), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const sheets = !!mesh.facets;
  const stroke = o.strokeColor ?? BRAND_RED;
  const fill = sheets ? stroke : o.occlude === false ? 'none' : (o.fill ?? '#000000');
  return (
    <svg
      viewBox={`0 0 ${mesh.width} ${mesh.height}`}
      preserveAspectRatio={preserveAspectRatio}
      className={className}
      style={style}
      aria-hidden
    >
      {o.background && <rect width={mesh.width} height={mesh.height} fill={o.background} />}
      <g
        fill={fill}
        stroke={stroke}
        strokeOpacity={sheets ? 0.5 : 1}
        strokeWidth={o.stroke ?? 1}
        strokeLinejoin="round"
      >
        {sheets
          ? mesh.facets!.map((fc, i) => <path key={i} d={fc.d} fillOpacity={fc.opacity} vectorEffect="non-scaling-stroke" />)
          : mesh.rows.map((d, i) => <path key={i} d={d} vectorEffect="non-scaling-stroke" />)}
      </g>
    </svg>
  );
}
