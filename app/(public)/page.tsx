import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import RotatingBanana from '@/src/components/rotating-banana';
import SubscribeForm from './_components/subscribe-form';

export default function WelcomePage() {
  return (
    <div className="relative h-dvh w-full overflow-hidden">
      <RotatingBanana solid={true} />

      {/* Sponsors button - top right */}
      <div className="absolute top-6 right-6 z-10">
        <Link
          href="/sponsor-deck"
          className="group flex items-center gap-2 px-4 py-3 text-base text-muted-foreground transition-colors hover:text-foreground"
        >
          <span className="font-medium">sponsors</span>
          <ArrowUpRight className="group-hover:-translate-y-0.5 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* Bottom section */}
      <div className="absolute right-0 bottom-8 left-0">
        <div className="flex flex-col items-center space-y-2">
          {/* Smaller ready? text */}
          <h1
            className="font-logo text-muted-foreground leading-none"
            style={{
              fontSize: 'clamp(1.5rem, 6vw, 4rem)',
              letterSpacing: '0.05em',
            }}
          >
            ready?
          </h1>

          {/* Email subscription form */}
          <SubscribeForm />
        </div>
      </div>
    </div>
  );
}
