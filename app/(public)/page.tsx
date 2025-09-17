'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function WelcomePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      question: 'WHAT IS CHILE TECH WEEK?',
      answer:
        "Chile Tech Week is a decentralized week where Chile's top tech companies host private tech events across Santiago. It's a showcase of innovation, networking, and collaboration in the Chilean tech ecosystem.",
    },
    {
      question: 'WHO CAN ATTEND?',
      answer:
        "Events are hosted by individual companies and each has their own admission criteria. Some are invite-only, others are open to the public. Check each event's details for specific requirements.",
    },
    {
      question: 'HOW DO I BECOME A HOST?',
      answer:
        "Any tech company, startup, or organization can host an event during Chile Tech Week. Simply submit your event through our platform and we'll help promote it to the community.",
    },
    {
      question: 'IS THIS AN OFFICIAL CONFERENCE?',
      answer:
        'No, Chile Tech Week is a decentralized initiative. Each event is independently organized by different companies and organizations. We simply provide the platform to showcase all events happening during the week.',
    },
  ];

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

      {/* FAQ Section */}
      <div className="min-h-screen bg-black p-8 md:p-16">
        <div className="mx-auto max-w-4xl">
          <div className="mb-16 text-center">
            <h2 className="inline-block border-8 border-white bg-primary px-12 py-8 font-black font-mono text-3xl text-white uppercase tracking-widest shadow-[16px_16px_0px_0px_#ffffff] md:text-7xl">
              FAQ
            </h2>
          </div>

          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <div key={faq.question} className="border-4 border-white">
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="flex w-full items-center justify-between bg-black p-8 text-left font-black font-mono text-lg text-white uppercase tracking-wide transition-all duration-200 hover:bg-white hover:text-black md:text-3xl"
                >
                  {faq.question}
                  <span
                    className={`transform text-2xl transition-transform duration-200 ${openFaq === index ? 'rotate-180' : ''}`}
                  >
                    ▼
                  </span>
                </button>
                {openFaq === index && (
                  <div className="border-black border-t-4 bg-white p-8">
                    <p className="font-mono text-black text-lg leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
