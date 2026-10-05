import { documentLocale } from '@/lib/i18n';

// The few words the game writes into the DOM itself (landing/scene.ts, the flock's HUD and
// roster), in the document's language: those modules run outside React, so they read
// <html lang> rather than the page's props.
const WORDS = {
  es: {
    west: 'O',
    inhabitants: 'hab.',
    thousand: 'mil',
    city: 'ciudad',
    peak: 'cumbre',
    reservoir: 'embalse',
    lake: 'lago',
    extent: 'km de extensión',
    noResults: 'Sin resultados',
    flyingAlone: 'vuelas solo',
    oneMore: '1 cóndor más en vuelo',
    flying: (n: number) => `${n} cóndores en vuelo`,
    offline: 'sin conexión, reintentando…',
    renamedTaken: (name: string) => `tu nombre estaba en uso: ahora eres ${name}`,
    nowYouAre: (name: string) => `ahora eres ${name}`,
    couldNotChange: 'no se pudo cambiar',
    flyBeside: 'Volar a su lado',
    yourName: 'Tu nombre de cóndor',
    andMore: (n: number) => `y ${n} más: filtra por nombre`,
    nobodyElse: 'Nadie más en vuelo',
  },
  en: {
    west: 'W',
    inhabitants: 'pop.',
    thousand: 'k',
    city: 'city',
    peak: 'peak',
    reservoir: 'reservoir',
    lake: 'lake',
    extent: 'km across',
    noResults: 'No results',
    flyingAlone: 'flying solo',
    oneMore: '1 more condor flying',
    flying: (n: number) => `${n} condors flying`,
    offline: 'offline, retrying…',
    renamedTaken: (name: string) => `your name was taken: you are now ${name}`,
    nowYouAre: (name: string) => `you are now ${name}`,
    couldNotChange: 'could not change it',
    flyBeside: 'Fly beside them',
    yourName: 'Your condor name',
    andMore: (n: number) => `and ${n} more: filter by name`,
    nobodyElse: 'Nobody else flying',
  },
};

export function words() {
  return WORDS[documentLocale()];
}
