import { useState } from 'react';

const FAQS = [
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

export function FaqSection() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div id="faq" className="min-h-screen bg-black p-8 md:p-16">
      <div className="mx-auto max-w-4xl">
        <div className="mb-16 text-center">
          <h2 className="inline-block border-8 border-white bg-primary px-12 py-8 font-mono text-3xl font-black uppercase tracking-widest text-white shadow-[16px_16px_0px_0px_#ffffff] md:text-7xl">
            FAQ
          </h2>
        </div>

        <div className="flex flex-col gap-6">
          {FAQS.map((faq, index) => (
            <div key={faq.question} className="border-4 border-white">
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === index ? null : index)}
                className="flex w-full items-center justify-between bg-black p-8 text-left font-mono text-lg font-black uppercase tracking-wide text-white transition-all duration-200 hover:bg-white hover:text-black md:text-3xl"
              >
                {faq.question}
                <span
                  className={`transform text-2xl transition-transform duration-200 ${openFaq === index ? 'rotate-180' : ''}`}
                >
                  ▼
                </span>
              </button>
              {openFaq === index && (
                <div className="border-t-4 border-black bg-white p-8">
                  <p className="font-mono text-lg leading-relaxed text-black">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
