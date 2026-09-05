import { Link } from '@inertiajs/react';
import { FaqSection } from '@/components/edition2025/faq-section';
import { PageHead, Wordmark } from '@/components/edition2025/layout';
import { edition2025_events_path, root_path } from '@/routes';
import type { Edition2025HomeShow } from '@/types';

// The 2025 landing as it was: the wordmark over black, the dates, the participating
// companies' logos (white until hovered) and the FAQ. "Become host" now points at the
// current edition instead of the closed submission form.
export default function Show({ logos, ...page }: Edition2025HomeShow) {
  return (
    <div className="relative w-full bg-black">
      <PageHead {...page} />

      <div className="relative h-dvh w-full overflow-hidden bg-black">
        <div className="absolute inset-0 z-10 flex items-center justify-center p-8">
          <Wordmark />
        </div>

        <div className="absolute top-8 right-8 z-10 text-right">
          <div className="inline-block border-4 border-black bg-white px-4 py-2 font-mono text-2xl font-black uppercase tracking-wider text-black shadow-[6px_6px_0px_0px_#000000]">
            NOV 17 - NOV 23
          </div>
          <div className="mt-2 border-2 border-white bg-black px-3 py-1 font-mono text-lg font-bold uppercase tracking-wide text-white">
            SANTIAGO, CHILE
          </div>
        </div>

        <div className="absolute bottom-12 left-1/2 z-10 -translate-x-1/2">
          <div className="flex gap-6">
            <Link
              href={edition2025_events_path()}
              className="border-2 border-primary bg-primary px-8 py-4 font-mono text-lg font-bold uppercase tracking-wide text-primary-foreground transition-colors hover:bg-primary/90"
            >
              See Events
            </Link>
            <Link
              href={root_path()}
              className="border-2 border-white bg-transparent px-8 py-4 font-mono text-lg font-bold uppercase tracking-wide text-white transition-colors hover:bg-white hover:text-black"
            >
              2026 Edition
            </Link>
          </div>
        </div>

        <div className="absolute right-8 bottom-6 z-10">
          <div className="animate-bounce">
            <div className="h-0 w-0 border-t-[15px] border-r-[10px] border-l-[10px] border-t-white border-r-transparent border-l-transparent" />
          </div>
        </div>
      </div>

      {logos.length > 0 && (
        <div id="companies" className="bg-black p-8 py-24 md:p-16">
          <div className="mx-auto max-w-6xl">
            <div className="mb-12 text-center">
              <h2 className="inline-block border-4 border-white bg-black px-8 py-4 font-mono text-2xl font-black uppercase tracking-wider text-white shadow-[8px_8px_0px_0px_#ffffff] md:text-4xl">
                Participating Companies
              </h2>
            </div>

            <div className="flex flex-wrap justify-center gap-8">
              {logos.map((logo) => (
                <div
                  key={logo.logoUrl}
                  className="group relative h-48 w-48 p-8 transition-all duration-300 md:h-56 md:w-56"
                >
                  <div className="relative h-full w-full">
                    <div
                      className="absolute inset-0 bg-white transition-opacity duration-300 group-hover:opacity-0"
                      style={{
                        maskImage: `url(${logo.logoUrl})`,
                        maskSize: 'contain',
                        maskRepeat: 'no-repeat',
                        maskPosition: 'center',
                        WebkitMaskImage: `url(${logo.logoUrl})`,
                        WebkitMaskSize: 'contain',
                        WebkitMaskRepeat: 'no-repeat',
                        WebkitMaskPosition: 'center',
                      }}
                    />
                    <img
                      src={logo.logoUrl}
                      alt={logo.companyName}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-contain opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <FaqSection />
    </div>
  );
}
