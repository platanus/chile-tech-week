import { logoPolicy } from './logo-upload';

type Options = { weekDates: { from: string; to: string }; descriptionLimit: number; communes: string[]; formats: string[] };
export type EventErrors = Record<string, string | undefined>;

// Match Event/Cohost's submission rules. Rails repeats these checks on submission.
export function validateEvent(data: FormData, options: Options): EventErrors {
  const errors: EventErrors = {};
  const text = (name: string) => String(data.get(name) ?? '').trim();
  const check = (name: string, key: string, kind = 'text', optional = false, limit?: number) => {
    const value = text(name);
    if (!value && !optional) errors[key] = 'Completa este campo.';
    else if (!value) return;
    else if (limit && [...value].length > limit) errors[key] = `Usa como máximo ${limit} caracteres.`;
    else if (kind === 'email' && !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*$/i.test(value)) errors[key] = 'Ingresa un email válido.';
    else if (kind === 'phone' && !/^\+[1-9][\d\s-]{6,20}$/.test(value)) errors[key] = 'Incluye el código de país, por ejemplo +56 9 8765 4321.';
    else if (kind === 'url' && !/^https:\/\/[^\s/$.?#].[^\s]*$/i.test(value)) errors[key] = 'Ingresa una dirección válida que comience con https://.';
  };
  const logo = (name: string, key: string) => {
    const file = data.get(name);
    if (!(file instanceof File) || !file.size) errors[key] = 'Selecciona el logo de la empresa.';
    else if (file.size > logoPolicy.maxBytes) errors[key] = logoPolicy.errors.size;
    else if (!logoPolicy.types.includes(file.type)) errors[key] = logoPolicy.errors.type;
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
    if (!value || !Number.isFinite(Date.parse(value))) errors[key] = 'Ingresa una fecha y hora válidas.';
    else if (value < `${options.weekDates.from}T00:00` || value > `${options.weekDates.to}T23:59`) errors[key] = 'La fecha debe estar dentro de la semana del evento.';
  }
  if (!errors.starts_at && !errors.ends_at && text('event[ends_at]') <= text('event[starts_at]')) errors.ends_at = 'El término debe ser después del inicio.';
  if (!options.communes.includes(text('event[commune]'))) errors.commune = 'Elige una comuna.';
  if (!options.formats.includes(text('event[format]'))) errors.format = 'Elige un formato.';
  const capacity = text('event[capacity]');
  if (!/^\d+$/.test(capacity) || Number(capacity) < 1 || Number(capacity) > 500_000) errors.capacity = 'Ingresa un número entero entre 1 y 500.000.';
  logo('event[logo_upload]', 'logo');
  if (!data.getAll('event[theme_ids][]').some(Boolean)) errors.themes = 'Elige al menos un tema.';
  if (!data.getAll('event[audience_ids][]').some(Boolean)) errors.audiences = 'Elige al menos una audiencia.';
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
