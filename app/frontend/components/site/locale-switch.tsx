import { usePage } from '@inertiajs/react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { type Locale, rememberLocale, useLocale } from '@/lib/i18n';

const NAMES: Record<Locale, string> = { es: 'Español', en: 'English' };

// ES · EN: the same page in the other language. A choice made here is remembered (the
// `locale` cookie, see Localized). Plain anchors, not Inertia links: the document's language,
// its hreflang tags and the landing's scene all belong to a fresh document. `exit` marks them
// for the landing's fade-out (landing/exit.ts).
export function LocaleSwitch({ className, exit = false }: { className?: string; exit?: boolean }) {
  const { localeSwitch } = usePage().props;
  const current = useLocale();
  if (!localeSwitch) return null;

  return (
    <nav aria-label="Idioma / Language" className={cn('label flex items-center gap-1.5', className)}>
      {(['es', 'en'] as const).map((locale, index) => (
        <span key={locale} className="flex items-center gap-1.5">
          {index > 0 && <span aria-hidden="true" className="opacity-40">·</span>}
          {locale === current ? (
            <span aria-current="true" title={NAMES[locale]}>
              {locale.toUpperCase()}
            </span>
          ) : (
            <a
              href={localeSwitch.alternates[locale]}
              hrefLang={locale}
              lang={locale}
              title={NAMES[locale]}
              data-exit={exit || undefined}
              onClick={() => rememberLocale(locale)}
              className="opacity-60 transition-opacity hover:opacity-100"
            >
              {locale.toUpperCase()}
            </a>
          )}
        </span>
      ))}
    </nav>
  );
}

// What the banner says, in the language it offers: whoever it is for may not read the page's.
const SUGGESTION: Record<Locale, { text: string; go: string; stay: string }> = {
  en: { text: 'This site is also available in English.', go: 'View in English', stay: 'Seguir en español' },
  es: { text: 'Este sitio también está en español.', go: 'Ver en español', stay: 'Stay in English' },
};

// Offered once to a visitor who has not chosen, when the server guesses they read the other
// language better (Localized#locale_suggestion). Either answer is remembered.
export function LocaleSuggestion({ exit = false }: { exit?: boolean }) {
  const { localeSwitch } = usePage().props;
  const current = useLocale();
  const [dismissed, setDismissed] = useState(false);
  const suggestion = localeSwitch?.suggestion;
  if (!localeSwitch || !suggestion || dismissed) return null;

  const copy = SUGGESTION[suggestion];
  return (
    <div
      role="region"
      aria-label={copy.text}
      lang={suggestion}
      className="locale-suggestion fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-xl flex-wrap items-center gap-x-5 gap-y-3 rounded-sm border border-[#262626] bg-black/95 px-5 py-4 text-[15px] text-white shadow-2xl sm:flex-nowrap"
    >
      <p className="m-0 flex-1 basis-full sm:basis-auto">{copy.text}</p>
      <a
        href={localeSwitch.alternates[suggestion]}
        hrefLang={suggestion}
        data-exit={exit || undefined}
        onClick={() => rememberLocale(suggestion)}
        className="whitespace-nowrap rounded-sm bg-[#ee2b2b] px-4 py-2.5 font-display text-[11px] font-extrabold uppercase tracking-[.04em] text-white no-underline transition-colors hover:bg-[#ff3d3d]"
      >
        {copy.go}
      </a>
      <button
        type="button"
        lang={current}
        onClick={() => {
          rememberLocale(current);
          setDismissed(true);
        }}
        className="label cursor-pointer whitespace-nowrap border-0 bg-transparent p-0 text-[#a3a3a3] transition-colors hover:text-white"
      >
        {copy.stay}
      </button>
    </div>
  );
}
