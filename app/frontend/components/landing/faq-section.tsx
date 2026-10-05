// The four questions from /25, translated without changing their content, in Spanish and
// English. The JSON is shared with Ruby, which repeats the Spanish ones in /llms.txt for agents.
import faqs from '../../../../config/faq.json';
import { copy, useI18n } from '@/lib/i18n';

const COPY = copy({ title: 'Preguntas frecuentes.' }, { title: 'Frequently asked questions.' });

export function FaqSection() {
  const { t, locale } = useI18n(COPY);
  return (
    <section id="faq" className="landing-slide faq-section" aria-labelledby="faq-title">
      <header>
        <h2 id="faq-title">{t.title}</h2>
      </header>
      <div className="faq-list">
        {faqs[locale].map(({ question, answer }, index) => (
          <details key={question} name="landing-faq">
            <summary>
              <span className="faq-number" aria-hidden="true">0{index + 1}</span>
              <span>{question}</span>
              <span className="faq-toggle" aria-hidden="true" />
            </summary>
            <p>{answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
