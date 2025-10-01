import Image from 'next/image';
import Link from 'next/link';
import { getPublishedEventLogos } from '@/src/queries/events';
import { FaqSection } from './_components/faq-section';

export default async function WelcomePage() {
  const logos = await getPublishedEventLogos();

  return (
    <div className="relative w-full bg-black">
      {/* Hero Section */}
      <div className="relative h-dvh w-full overflow-hidden bg-black">
        {/* Main content - centered logo */}
        <div className="absolute inset-0 z-10 flex items-center justify-center p-8">
          <div className="space-y-0 text-center">
            {/* First line - Solid primary color */}
            <div className="font-black font-mono text-primary text-xl uppercase tracking-wider md:text-6xl lg:text-7xl">
              CHILE TECH WEEK 2025
            </div>

            {/* Second line - Solid transition color */}
            <div
              className="font-black font-mono text-xl uppercase tracking-wider md:text-6xl lg:text-7xl"
              style={{ color: 'hsl(0, 60%, 70%)' }}
            >
              CHILE TECH WEEK 2025
            </div>

            {/* Third line - Solid white */}
            <div className="font-black font-mono text-white text-xl uppercase tracking-wider md:text-6xl lg:text-7xl">
              CHILE TECH WEEK 2025
            </div>
          </div>
        </div>

        {/* Top right date info */}
        <div className="absolute top-8 right-8 z-10 text-right">
          <div className="border-4 border-black bg-white px-4 py-2 font-black font-mono text-2xl text-black uppercase tracking-wider shadow-[6px_6px_0px_0px_#000000]">
            NOV 17 - NOV 23
          </div>
          <div className="mt-2 border-2 border-white bg-black px-3 py-1 font-bold font-mono text-lg text-white uppercase tracking-wide">
            SANTIAGO, CHILE
          </div>
        </div>

        {/* Bottom action buttons */}
        <div className="-translate-x-1/2 absolute bottom-12 left-1/2 z-10">
          <div className="flex gap-6">
            <Link
              href="/events"
              className="border-2 border-primary bg-primary px-8 py-4 font-bold font-mono text-lg text-primary-foreground uppercase tracking-wide transition-colors hover:bg-primary/90"
            >
              See Events
            </Link>
            <Link
              href="/create"
              className="border-2 border-white bg-transparent px-8 py-4 font-bold font-mono text-lg text-white uppercase tracking-wide transition-colors hover:bg-white hover:text-black"
            >
              Become Host
            </Link>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute right-8 bottom-6 z-10">
          <div className="animate-bounce">
            <div className="h-0 w-0 border-t-[15px] border-t-white border-r-[10px] border-r-transparent border-l-[10px] border-l-transparent"></div>
          </div>
        </div>
      </div>

      {/* Company Logos Section */}
      {logos.length > 0 && (
        <div className="bg-black p-8 py-24 md:p-16">
          <div className="mx-auto max-w-6xl">
            <div className="mb-12 text-center">
              <h2 className="inline-block border-4 border-white bg-black px-8 py-4 font-black font-mono text-2xl text-white uppercase tracking-wider shadow-[8px_8px_0px_0px_#ffffff] md:text-4xl">
                Participating Companies
              </h2>
            </div>

            <div className="flex flex-wrap justify-center gap-8">
              {logos.map((logo) => (
                <div
                  key={logo.logoUrl}
                  className="group relative h-48 w-48 p-8 transition-all duration-300 md:h-56 md:w-56"
                >
                  <Image
                    src={logo.logoUrl}
                    alt={logo.companyName}
                    fill
                    className="object-contain grayscale transition-all duration-300 group-hover:grayscale-0"
                  />
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
