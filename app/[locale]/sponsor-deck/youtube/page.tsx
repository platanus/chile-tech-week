'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import RotatingBanana from '@/src/components/rotating-banana';
import { Button } from '@/src/components/ui/button';

export default function SponsorDeckYoutubePage() {
  return (
    <div className="relative mx-auto flex max-w-6xl">
      {/* Rotating banana background */}
      <div className="-z-10 fixed inset-0 opacity-20">
        <RotatingBanana />
      </div>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-2xl space-y-12 px-6 py-8 font-geist">
        {/* Back Button */}
        <div className="flex justify-start">
          <Button variant="outline" asChild>
            <Link href="/sponsor-deck" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Sponsor Deck
            </Link>
          </Button>
        </div>

        {/* Header */}
        <div className="space-y-4 text-center">
          <div className="text-6xl">🎥</div>
          <h1 className="font-bold text-4xl">Visibilidad - Youtube</h1>
        </div>

        {/* YouTube Video Embeds */}
        <section className="space-y-8">
          <div className="aspect-video w-full">
            <iframe
              src="https://www.youtube.com/embed/iaxaSVp2m_4"
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="h-full w-full rounded-lg"
            />
          </div>

          <div className="aspect-video w-full">
            <iframe
              src="https://www.youtube.com/embed/id0ZAujW-78"
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="h-full w-full rounded-lg"
            />
          </div>
        </section>
      </main>
    </div>
  );
}
