import type { Locale } from './i18n';
import { logoCopy, logoPolicy } from './logo-upload';

type Options = { weekDates: { from: string; to: string }; descriptionLimit: number; formats: string[]; locale?: Locale };
export type EventErrors = Record<string, string | undefined>;

const MESSAGES = {
  es: {
    required: 'Completa este campo.',
    tooLong: (limit: number) => `Usa como máximo ${limit} caracteres.`,
    email: 'Ingresa un email válido.',
    phone: 'Incluye el código de país, por ejemplo +56 9 8765 4321.',
    url: 'Ingresa una dirección válida que comience con https://.',
    logo: 'Selecciona el logo de la empresa.',
    dateTime: 'Ingresa una fecha y hora válidas.',
    week: 'La fecha debe estar dentro de la semana del evento.',
    endAfterStart: 'El término debe ser después del inicio.',
    address: 'Busca la dirección y elígela de la lista.',
    format: 'Elige un formato.',
    capacity: 'Ingresa un número entero entre 1 y 500.000.',
    themes: 'Elige al menos un tema.',
    audiences: 'Elige al menos una audiencia.',
  },
  en: {
    required: 'Fill in this field.',
    tooLong: (limit: number) => `Use at most ${limit} characters.`,
    email: 'Enter a valid email.',
    phone: 'Include the country code, for example +56 9 8765 4321.',
    url: 'Enter a valid address starting with https://.',
    logo: "Choose the company's logo.",
    dateTime: 'Enter a valid date and time.',
    week: "The date must fall within the event's week.",
    endAfterStart: 'The end must be after the start.',
    address: 'Search for the address and pick it from the list.',
    format: 'Choose a format.',
    capacity: 'Enter a whole number between 1 and 500,000.',
    themes: 'Choose at least one topic.',
    audiences: 'Choose at least one audience.',
  },
} satisfies Record<Locale, unknown>;

// Match Event/Cohost's submission rules. Rails repeats these checks on submission.
export function validateEvent(data: FormData, options: Options): EventErrors {
  const errors: EventErrors = {};
  const m = MESSAGES[options.locale ?? 'es'];
  const logoErrors = logoCopy(options.locale).errors;
  const text = (name: string) => String(data.get(name) ?? '').trim();
  const check = (name: string, key: string, kind = 'text', optional = false, limit?: number) => {
    const value = text(name);
    if (!value && !optional) errors[key] = m.required;
    else if (!value) return;
    else if (limit && [...value].length > limit) errors[key] = m.tooLong(limit);
    else if (kind === 'email' && !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*$/i.test(value)) errors[key] = m.email;
    else if (kind === 'phone' && !/^\+[1-9][\d\s-]{6,20}$/.test(value)) errors[key] = m.phone;
    else if (kind === 'url' && !/^https:\/\/[^\s/$.?#].[^\s]*$/i.test(value)) errors[key] = m.url;
  };
  const logo = (name: string, key: string) => {
    const file = data.get(name);
    if (!(file instanceof File) || !file.size) errors[key] = m.logo;
    else if (file.size > logoPolicy.maxBytes) errors[key] = logoErrors.size;
    else if (!logoPolicy.types.includes(file.type)) errors[key] = logoErrors.type;
    // Decoding and dimension checks belong to LogoInput; its custom validity blocks submission.
  };
  for (const field of ['company_name', 'author_name']) check(`event[${field}]`, field);
  check('event[company_website]', 'company_website', 'url');
  check('event[author_email]', 'author_email', 'email');
  check('event[author_phone_number]', 'author_phone_number', 'phone');
  check('event[title]', 'title', 'text', false, 500);
  check('event[description]', 'description', 'text', false, options.descriptionLimit);
  for (const key of ['starts_at', 'ends_at']) {
    const value = text(`event[${key}]`);
    if (!value || !Number.isFinite(Date.parse(value))) errors[key] = m.dateTime;
    else if (value < `${options.weekDates.from}T00:00` || value > `${options.weekDates.to}T23:59`) errors[key] = m.week;
  }
  if (!errors.starts_at && !errors.ends_at && text('event[ends_at]') <= text('event[starts_at]')) errors.ends_at = m.endAfterStart;
  // AddressInput fills these only from a result picked in its list.
  if (!text('event[address]') || !text('event[commune]')) errors.address = m.address;
  if (!options.formats.includes(text('event[format]'))) errors.format = m.format;
  const capacity = text('event[capacity]');
  if (!/^\d+$/.test(capacity) || Number(capacity) < 1 || Number(capacity) > 500_000) errors.capacity = m.capacity;
  logo('event[logo_upload]', 'logo');
  if (!data.getAll('event[theme_ids][]').some(Boolean)) errors.themes = m.themes;
  if (!data.getAll('event[audience_ids][]').some(Boolean)) errors.audiences = m.audiences;
  const indices = new Set([...data.keys()].flatMap((name) => name.match(/^event\[cohosts_attributes\]\[(\d+)\]/)?.[1] ?? []));
  for (const index of indices) {
    const prefix = `event[cohosts_attributes][${index}]`;
    const key = (field: string) => `cohosts[${index}].${field}`;
    check(`${prefix}[company_name]`, key('company_name'), 'text', false, 255);
    check(`${prefix}[primary_contact_name]`, key('primary_contact_name'));
    check(`${prefix}[primary_contact_email]`, key('primary_contact_email'), 'email');
    check(`${prefix}[primary_contact_phone_number]`, key('primary_contact_phone_number'), 'phone', true);
    check(`${prefix}[primary_contact_website]`, key('primary_contact_website'), 'url', true);
    check(`${prefix}[primary_contact_linkedin]`, key('primary_contact_linkedin'), 'url', true);
    logo(`${prefix}[logo_upload]`, key('logo'));
  }
  return errors;
}
