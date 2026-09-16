// The four questions from /25, translated without changing their content. The JSON is
// shared with Ruby, which repeats them in /llms.txt for agents.
import faqs from '../../../../config/faq.json';

export function FaqSection() {
  return (
    <section id="faq" className="landing-slide faq-section" aria-labelledby="faq-title">
      <header>
        <h2 id="faq-title">Preguntas frecuentes.</h2>
      </header>
      <div className="faq-list">
        {faqs.map(({ question, answer }, index) => (
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
