import { type CSSProperties, useEffect, useId, useRef, useState } from 'react';

// Optimized logos from /25 and official brand sites, independent of archived records.
const organizers = [
  { name: 'Emprende tu Mente (EtM)', file: 'etm', width: 480, height: 106 },
  { name: 'ACVC', file: 'acvc', width: 480, height: 159 },
  { name: 'Platanus', file: 'platanus', width: 480, height: 94 },
  { name: 'Endeavor', file: 'endeavor', width: 480, height: 63 },
  { name: 'Fundación Chile', file: 'fundacion-chile', width: 480, height: 106 },
  { name: 'Startups Latam', file: 'startups-latam', width: 452, height: 200 },
  { name: 'CORFO', file: 'corfo', width: 404, height: 131 },
  { name: 'Start-Up Chile', file: 'startup-chile', width: 480, height: 43 },
  { name: 'Impacta VC', file: 'impacta-vc', width: 480, height: 132 },
  { name: 'DF MAS', file: 'df-mas', width: 480, height: 146 },
  { name: 'PRenseable', file: 'prenseable', width: 480, height: 112 },
];

export function OrganizersSection() {
  const maskId = useId();
  const section = useRef<HTMLElement>(null);
  const [cutout, setCutout] = useState<{ src: string; x: number; y: number; width: number; height: number } | null>(null);
  const showCutout = (image: HTMLImageElement) => {
    if (!section.current || !image.complete || !image.naturalWidth) return;
    const bounds = section.current.getBoundingClientRect();
    const logo = image.getBoundingClientRect();
    setCutout({ src: image.src, x: logo.x - bounds.x, y: logo.y - bounds.y, width: logo.width, height: logo.height });
  };

  // A resize changes the grid geometry; wait for the next hover to measure it again.
  useEffect(() => {
    const clear = () => setCutout(null);
    window.addEventListener('resize', clear);
    return () => window.removeEventListener('resize', clear);
  }, []);

  const grid = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const element = grid.current;
    if (!element || !('IntersectionObserver' in window)) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motion.matches) return;

    // Observe each logo so even the last row on a small phone enters on screen.
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.2 });
    element.classList.add('reveal-ready');
    for (const child of element.children) observer.observe(child);

    const stopMotion = () => {
      if (motion.matches) {
        element.classList.remove('reveal-ready');
        observer.disconnect();
      }
    };
    motion.addEventListener('change', stopMotion);
    return () => {
      observer.disconnect();
      element.classList.remove('reveal-ready');
      motion.removeEventListener('change', stopMotion);
    };
  }, []);

  return (
    <section id="organizers" className="landing-slide organizers-section" aria-labelledby="organizers-title" ref={section}>
      {/* A hole in the black section reveals the original live scene, without copying its canvas. */}
      <svg className="organizers-backdrop" width="100%" height="100%" aria-hidden="true">
        <defs>
          <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%" style={{ maskType: 'luminance' }}>
            <rect width="100%" height="100%" fill="white" />
            {cutout && (
              <image key={cutout.src} href={cutout.src} x={cutout.x} y={cutout.y} width={cutout.width} height={cutout.height} className="organizer-cutout" />
            )}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="black" mask={`url(#${maskId})`} />
        {/* A white tint gives even a completely black background a readable logo silhouette. */}
        {cutout && (
          <image key={cutout.src} href={cutout.src} x={cutout.x} y={cutout.y} width={cutout.width} height={cutout.height} className="organizer-cutout organizer-cutout-tint" />
        )}
      </svg>
      <header>
        <h2 id="organizers-title">La semana tech descentralizada</h2>
        <p>Organizada por el centro del ecosistema tech chileno</p>
      </header>
      <ul className="organizers-grid" ref={grid}>
        {organizers.map(({ name, file, width, height }, index) => (
          <li key={file} style={{ '--delay': `${index * 70}ms` } as CSSProperties}>
            <div className="organizer-mark"
              onPointerEnter={(event) => {
                if (event.pointerType === 'mouse') {
                  const image = event.currentTarget.querySelector('img');
                  if (image) showCutout(image);
                }
              }}
              onPointerLeave={() => setCutout(null)}
              data-cutout={cutout?.src.endsWith(`/${file}.webp`) || undefined}
            >
              <img src={`/organizers/${file}.webp`} alt={name} width={width} height={height} loading="lazy" decoding="async" />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
