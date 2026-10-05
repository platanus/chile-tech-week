import { usePage } from '@inertiajs/react';

// The public site speaks Spanish at / and English under /en (Localized, on the server). The
// server decides the language from the URL and shares it as `locale`; each component keeps
// its own copy in both languages next to its markup:
//
//   const COPY = copy({ title: 'Eventos' }, { title: 'Events' });
//   const { t, lp } = useI18n(COPY);
//   <Link href={events_path(lp)}>{t.title}</Link>
//
// `copy` makes the English object carry exactly the Spanish one's keys, so a string missing in
// either language is a type error. `lp` keeps the links Rails' route helpers build in the
// page's language.
export type Locale = 'es' | 'en';

export function copy<T>(es: T, en: NoInfer<T>): Record<Locale, T> {
  return { es, en };
}

export function useLocale(): Locale {
  return usePage().props.locale === 'en' ? 'en' : 'es';
}

/** The js-routes options for a link in `locale`: `events_path(routeLocale('en'))` is /en/events. */
export function routeLocale(locale: Locale): { locale?: 'en' } {
  return locale === 'en' ? { locale: 'en' } : {};
}

export function useI18n<T>(messages: Record<Locale, T>) {
  const locale = useLocale();
  return { t: messages[locale], locale, lp: routeLocale(locale) };
}

/** The language of the document, for the modules outside React (the landing's scene, the flock). */
export function documentLocale(): Locale {
  return typeof document !== 'undefined' && document.documentElement.lang === 'en' ? 'en' : 'es';
}

// The visitor's choice, read by the server (Localized): only the switcher and the suggestion
// banner write it, never a visit to a page.
export function rememberLocale(locale: Locale) {
  const secure = window.location.protocol === 'https:' ? '; secure' : '';
  document.cookie = `locale=${locale}; path=/; max-age=31536000; samesite=lax${secure}`;
}
