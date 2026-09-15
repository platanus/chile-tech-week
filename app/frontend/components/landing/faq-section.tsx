// The four questions from /25, translated without changing their content.
const faqs = [
  {
    question: '¿Qué es Chile Tech Week?',
    answer:
      'Chile Tech Week es una semana descentralizada en la que las principales empresas tecnológicas de Chile organizan eventos privados de tecnología en distintos lugares de Santiago. Es una vitrina de innovación, conexiones y colaboración en el ecosistema tecnológico chileno.',
  },
  {
    question: '¿Quiénes pueden asistir?',
    answer:
      'Cada empresa organiza sus propios eventos y define sus criterios de admisión. Algunos son solo por invitación y otros están abiertos al público. Revisa los detalles de cada evento para conocer sus requisitos específicos.',
  },
  {
    question: '¿Cómo puedo organizar un evento?',
    answer:
      'Cualquier empresa tecnológica, startup u organización puede organizar un evento durante Chile Tech Week. Solo tienes que enviar tu evento a través de nuestra plataforma y te ayudaremos a difundirlo entre la comunidad.',
  },
  {
    question: '¿Es una conferencia oficial?',
    answer:
      'No, Chile Tech Week es una iniciativa descentralizada. Cada evento es organizado de forma independiente por distintas empresas y organizaciones. Nuestra plataforma reúne y da visibilidad a todos los eventos que se realizan durante la semana.',
  },
];

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
