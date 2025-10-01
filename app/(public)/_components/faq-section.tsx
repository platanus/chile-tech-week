'use client';

import { useState } from 'react';

export function FaqSection() {
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
  );
}
