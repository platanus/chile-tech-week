import { Form, Link } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, Check, Plus, Trash2 } from 'lucide-react';
import { cloneElement, type ReactElement, type ReactNode, useEffect, useRef, useState } from 'react';
import { AddressInput } from '@/components/events/address-input';
import { DateTimeField } from '@/components/events/date-time-field';
import { LogoInput } from '@/components/events/logo-input';
import { FORMAT_LABELS } from '@/components/events/formats';
import { PageHead } from '@/components/site/layout';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { validateEvent, type EventErrors } from '@/lib/event-validation';
import { copy, useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { events_path } from '@/routes';
import type { EventPrefill, EventsNew } from '@/types';

type Errors = Record<string, string[] | string | undefined>;

const COPY = copy(
  {
    steps: ['Organizador', 'Evento', 'Temas y audiencias', 'Co-hosts'],
    durationOrder: 'El término debe ser después del inicio.',
    durationLong: (hours: number) => `Este evento dura ${hours} horas. ¿Es correcto? La mayoría dura 4 horas o menos.`,
    kicker: '16 al 22 de noviembre',
    title: 'Organiza un evento',
    intro: 'Cuéntanos de tu evento. Lo revisamos, creamos su página en Luma para que la edites y lo publicamos en el programa.',
    organizer: 'Organizador',
    organizerHint: 'Quién organiza y a quién le escribimos.',
    companyName: 'Nombre de la empresa',
    website: 'Sitio web',
    websitePlaceholder: 'https://empresa.cl',
    contactName: 'Nombre de contacto',
    contactEmail: 'Email de contacto',
    contactEmailHint: 'A este email llegarán las novedades de tu evento.',
    emailPlaceholder: 'ada@empresa.cl',
    contactPhone: 'Teléfono de contacto',
    event: 'Evento',
    eventHint: 'Qué es, cuándo y dónde.',
    eventTitle: 'Título',
    eventTitlePlaceholder: 'Demo Day de fintechs',
    description: 'Descripción',
    characters: (count: number, limit: number) => `${count}/${limit} caracteres`,
    descriptionPlaceholder: 'Una descripción corta de tu evento',
    week: 'Así va la semana',
    weekNote: 'Eventos ya publicados por día.',
    start: 'Inicio',
    end: 'Término',
    address: 'Dirección',
    addressHint: 'Escribe la calle y el número, o el nombre del lugar, y elige una opción de la lista.',
    format: 'Formato',
    formatPlaceholder: 'Elige un formato',
    capacity: 'Capacidad',
    capacityHint: 'Cantidad aproximada de asistentes.',
    logo: 'Logo de la empresa',
    catalogue: 'Temas y audiencias',
    catalogueHint: 'Así la gente encuentra tu evento en el programa.',
    themes: 'Temas',
    themesPick: 'Temas · elige al menos uno',
    audiences: 'Audiencias',
    audiencesPick: 'Audiencias · elige al menos una',
    cohosts: 'Co-hosts (opcional)',
    cohostsIntro: 'Las empresas que organizan el evento contigo. Cada contacto recibe la invitación de editor en Luma.',
    cohost: (n: number) => `Co-host ${n}`,
    remove: 'Quitar',
    cohostEmailHint: 'A este email llegará la invitación de editor en Luma.',
    phoneOptional: 'Teléfono (opcional)',
    websiteOptional: 'Sitio web (opcional)',
    linkedinOptional: 'LinkedIn (opcional)',
    linkedinPlaceholder: 'https://linkedin.com/in/usuario',
    addCohost: 'Agregar co-host',
    back: 'Atrás',
    continue: 'Continuar',
    sending: 'Enviando…',
    submit: 'Enviar evento',
    cancel: 'Cancelar',
    stepOf: (step: number, total: number) => `Paso ${step} de ${total}`,
    review: 'Revisa los campos marcados: hay datos que faltan o no son válidos.',
  },
  {
    steps: ['Host', 'Event', 'Topics and audiences', 'Co-hosts'],
    durationOrder: 'The end must be after the start.',
    durationLong: (hours: number) => `This event lasts ${hours} hours. Is that right? Most last 4 hours or less.`,
    kicker: 'November 16–22',
    title: 'Host an event',
    intro: "Tell us about your event. We review it, create its Luma page for you to edit and publish it in the programme.",
    organizer: 'Host',
    organizerHint: "Who's hosting and who we write to.",
    companyName: 'Company name',
    website: 'Website',
    websitePlaceholder: 'https://company.com',
    contactName: 'Contact name',
    contactEmail: 'Contact email',
    contactEmailHint: "Your event's updates will reach this email.",
    emailPlaceholder: 'ada@company.com',
    contactPhone: 'Contact phone',
    event: 'Event',
    eventHint: 'What it is, when and where.',
    eventTitle: 'Title',
    eventTitlePlaceholder: 'Fintech Demo Day',
    description: 'Description',
    characters: (count: number, limit: number) => `${count}/${limit} characters`,
    descriptionPlaceholder: 'A short description of your event',
    week: 'The week so far',
    weekNote: 'Events already published per day.',
    start: 'Start',
    end: 'End',
    address: 'Address',
    addressHint: "Type the street and number, or the venue's name, and pick an option from the list.",
    format: 'Format',
    formatPlaceholder: 'Choose a format',
    capacity: 'Capacity',
    capacityHint: 'Approximate number of attendees.',
    logo: "Company's logo",
    catalogue: 'Topics and audiences',
    catalogueHint: 'This is how people find your event in the programme.',
    themes: 'Topics',
    themesPick: 'Topics · choose at least one',
    audiences: 'Audiences',
    audiencesPick: 'Audiences · choose at least one',
    cohosts: 'Co-hosts (optional)',
    cohostsIntro: 'The companies hosting the event with you. Each contact gets the editor invitation on Luma.',
    cohost: (n: number) => `Co-host ${n}`,
    remove: 'Remove',
    cohostEmailHint: 'The Luma editor invitation will reach this email.',
    phoneOptional: 'Phone (optional)',
    websiteOptional: 'Website (optional)',
    linkedinOptional: 'LinkedIn (optional)',
    linkedinPlaceholder: 'https://linkedin.com/in/username',
    addCohost: 'Add co-host',
    back: 'Back',
    continue: 'Continue',
    sending: 'Sending…',
    submit: 'Submit event',
    cancel: 'Cancel',
    stepOf: (step: number, total: number) => `Step ${step} of ${total}`,
    review: 'Check the highlighted fields: some details are missing or invalid.',
  },
);

function FieldError({ errors, name }: { errors: Errors; name: string }) {
  const error = errors[name];
  if (!error) return null;
  return <p id={`${name}-error`} aria-live="polite" className="text-sm text-primary">{Array.isArray(error) ? error.join('. ') : error}</p>;
}

function Field({ label, htmlFor, hint, children, errors, name, className }: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: ReactNode;
  errors: Errors;
  name: string;
  className?: string;
}) {
  return (
    <div data-field={name} className={cn('flex flex-col gap-2', className)}>
      <Label htmlFor={htmlFor} className="label text-[11px] text-muted-foreground">
        {label}
      </Label>
      {cloneElement(children as ReactElement<Record<string, unknown>>, {
        'aria-invalid': !!errors[name],
        'aria-describedby': errors[name] ? `${name}-error` : undefined,
      })}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <FieldError errors={errors} name={name} />
    </div>
  );
}

// The form is four steps rather than one long page, but only visually: every field stays
// mounted and the inactive steps are hidden, so values (and the files already chosen in a
// file input, which cannot be restored programmatically) survive moving back and forth, and
// one submit sends the lot. `display: none` inline, since a `hidden` attribute would lose to
// the flex utility on the same element.
const STEPS = [
  {fields: ['company_name', 'company_website', 'author_name', 'author_email', 'author_phone_number']},
  {fields: ['title', 'description', 'starts_at', 'ends_at', 'address', 'commune', 'latitude', 'longitude', 'format', 'capacity', 'logo']},
  {fields: ['themes', 'audiences']},
  {fields: []}
] as const;

// Anything the server complains about that is not named above is a co-host field
// ("cohosts[0].company_name"), which lives in the last step.
function stepOfError(key: string) {
  const found = STEPS.findIndex((step) => (step.fields as readonly string[]).includes(key));
  return found === -1 ? STEPS.length - 1 : found;
}

function Step({ index, current, children }: { index: number; current: number; children: ReactNode }) {
  return (
    <section data-step={index} className="flex flex-col gap-6" style={index === current ? undefined : {display: 'none'}}>
      {children}
    </section>
  );
}

// The progress bar: where the visitor is, what is left, and a way back to any step already
// seen. Steps ahead are not links — the point is to keep the form short, not to police it.
function Stepper({ current, furthest, onGo }: { current: number; furthest: number; onGo: (index: number) => void }) {
  const { t } = useI18n(COPY);
  return (
    <ol className="flex flex-wrap gap-x-6 gap-y-2 border-b border-border pb-4">
      {t.steps.map((title, index) => {
        const done = index < furthest;
        const reachable = index <= furthest;
        return (
          <li key={title}>
            <button
              type="button"
              disabled={!reachable}
              onClick={() => onGo(index)}
              aria-current={index === current ? 'step' : undefined}
              className={cn(
                'label flex items-center gap-2 py-1 transition-colors',
                index === current ? 'text-primary' : reachable ? 'text-foreground hover:text-primary' : 'text-muted-foreground'
              )}
            >
              <span
                className={cn(
                  'flex size-5 items-center justify-center rounded-full border text-[10px]',
                  index === current ? 'border-primary text-primary' : done ? 'border-foreground' : 'border-border text-muted-foreground'
                )}
              >
                {done ? <Check className="size-3" /> : index + 1}
              </span>
              {title}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

// The submit lands on whichever step the server complained about first, so its message is
// never on a step the visitor cannot see.
function ErrorStep({ errors, onGo }: { errors: Errors; onGo: (index: number) => void }) {
  const keys = Object.keys(errors).join(',');
  useEffect(() => {
    if (!keys) return;

    onGo(Math.min(...Object.keys(errors).map(stepOfError)));
    // `onGo` is recreated on every render; the errors changing is the signal that matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys]);
  return null;
}

// The step's heading. Its number lives in the stepper above, not here.
function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-border pb-3">
      <h2 className="font-display text-xl font-extrabold uppercase tracking-[-0.03em]">{title}</h2>
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
}

function LogoField({ name, label, errors, errorName, onValidation }: { name: string; label: string; errors: Errors; errorName: string; onValidation: (input: HTMLInputElement) => void }) {
  const error = errors[errorName.replace('company_logo_url', 'logo')] || errors[errorName];
  return <div data-field={errorName.replace('company_logo_url', 'logo')}><LogoInput onValidation={onValidation} name={name} label={label} required error={Array.isArray(error) ? error.join('. ') : error} /></div>;
}

// The catalogue pickers (temas, audiencias): a grid of checkboxes posting `name[]`.
function CheckboxGrid({ name, options, checked = [], errors, errorName, label }: {
  name: string;
  options: { id: string; name: string }[];
  checked?: string[];
  errors: Errors;
  errorName: string;
  label: string;
}) {
  return (
    <div data-field={errorName} role="group" aria-label={label} aria-describedby={errors[errorName] ? `${errorName}-error` : undefined} className="flex flex-col gap-2">
      <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2 md:grid-cols-3">
        {options.map((option) => (
          <label key={option.id} className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox name={name} value={option.id} defaultChecked={checked.includes(option.id)} aria-invalid={!!errors[errorName]} />
            {option.name}
          </label>
        ))}
      </div>
      <FieldError errors={errors} name={errorName} />
    </div>
  );
}

// The "YYYY-MM-DDTHH:MM" strings DateTimeField speaks, no zone (the server reads them in
// Santiago time).
function addHours(value: string, hours: number) {
  const [date, time] = value.split('T');
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d, hh + hours, mm));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}T${pad(t.getUTCHours())}:${pad(t.getUTCMinutes())}`;
}

function hoursBetween(start: string, end: string) {
  return (Date.parse(`${end}:00Z`) - Date.parse(`${start}:00Z`)) / 3_600_000;
}

// A prefilled address counts as picked only with its commune; coordinates are optional.
function prefilledPlace(pre: EventPrefill) {
  if (!pre.address) return undefined;
  const coordinate = (value?: string) => (value ? Number(value) : undefined);
  return { address: pre.address, commune: pre.commune, latitude: coordinate(pre.latitude), longitude: coordinate(pre.longitude) };
}

const inputClass = 'h-11 border-input bg-transparent px-3 text-base focus-visible:border-primary focus-visible:ring-0';
const selectClass = 'h-11! w-full border-input bg-transparent px-3 text-base focus-visible:border-primary focus-visible:ring-0';
const pickerClass = 'h-11! border-input bg-transparent px-3 text-base hover:bg-transparent focus-visible:border-primary focus-visible:ring-0';
const popoverClass = 'site min-h-0 border-border bg-popover text-popover-foreground';

// The submission form: the organiser, the event, the catalogue and the optional co-hosts,
// posted as one Rails nested form (event[…], event[cohosts_attributes][i][…]).
export default function New({ days, weekDates, formats, themes, audiences, descriptionLimit, prefill, step: initialStep, ...page }: EventsNew) {
  const { t, locale, lp } = useI18n(COPY);
  // `prefill`/`step` only arrive in development (EventsController#prefill_from_url).
  const pre = prefill ?? {};
  const [description, setDescription] = useState(pre.description ?? '');
  const [startsAt, setStartsAt] = useState(pre.starts_at ?? '');
  const [endsAt, setEndsAt] = useState(pre.ends_at ?? '');
  const [cohostIds, setCohostIds] = useState<number[]>([]);
  const [nextCohostId, setNextCohostId] = useState(0);


  const duration = startsAt && endsAt ? hoursBetween(startsAt, endsAt) : null;
  const durationWarning =
    duration === null
      ? null
      : duration <= 0
        ? t.durationOrder
        : duration > 4
          ? t.durationLong(Math.round(duration))
          : null;

  const [step, setStep] = useState(initialStep ?? 0);
  const [furthest, setFurthest] = useState(initialStep ?? 0);
  const formRef = useRef<HTMLDivElement>(null);
  const last = STEPS.length - 1;

  const goTo = (index: number) => {
    setStep(index);
    setFurthest((seen) => Math.max(seen, index));
    formRef.current?.scrollIntoView({behavior: 'smooth', block: 'start'});
  };

  const [clientErrors, setClientErrors] = useState<EventErrors>({});
  const touched = useRef(new Set<string>());

  const readErrors = () => {
    const form = formRef.current?.querySelector('form');
    if (!form) return {};
    const errors = validateEvent(new FormData(form), { weekDates, descriptionLimit, formats, locale });
    for (const input of form.querySelectorAll<HTMLInputElement>('input[type="file"]')) {
      const key = input.closest<HTMLElement>('[data-field]')?.dataset.field;
      if (key && input.validity.customError) errors[key] = input.validationMessage;
    }
    return errors;
  };

  const refreshField = (target: EventTarget, blur = false) => {
    if (!(target instanceof HTMLElement)) return;
    const key = target.closest<HTMLElement>('[data-field]')?.dataset.field;
    if (!key) return;
    if (blur || target.matches('input[type="file"], input[type="checkbox"], [role="checkbox"], button[role="combobox"]')) touched.current.add(key);
    // Radix's hidden controls and React's date autofill settle before reading FormData.
    setTimeout(() => {
      const errors = readErrors();
      setClientErrors(Object.fromEntries([...touched.current].map((name) => [name, errors[name]])));
    }, 0);
  };

  const validate = (onlyStep?: number) => {
    const errors = readErrors();
    const keys = [...(formRef.current?.querySelectorAll<HTMLElement>('[data-field]') ?? [])]
      .map((field) => field.dataset.field!)
      .filter((key) => onlyStep === undefined || stepOfError(key) === onlyStep);
    keys.forEach((key) => touched.current.add(key));
    setClientErrors(Object.fromEntries([...touched.current].map((key) => [key, errors[key]])));
    const first = keys.find((key) => errors[key]);
    if (!first) return true;
    goTo(stepOfError(first));
    requestAnimationFrame(() => {
      const field = [...(formRef.current?.querySelectorAll<HTMLElement>('[data-field]') ?? [])].find((field) => field.dataset.field === first);
      field?.querySelector<HTMLElement>('input, textarea, button')?.focus();
    });
    return false;
  };

  // The date and address pickers change hidden fields, which fire no event the form hears.
  const refreshById = (id: string) => {
    const element = document.getElementById(id);
    if (element) refreshField(element, true);
  };

  const onStartChange = (value: string) => {
    setStartsAt(value);
    refreshById('starts_at');
    if (value && (!endsAt || endsAt <= value)) {
      setEndsAt(addHours(value, 2));
      if (touched.current.has('ends_at')) refreshById('ends_at');
    }
  };

  const onEndChange = (value: string) => {
    setEndsAt(value);
    refreshById('ends_at');
  };

  const nextStep = (event: React.MouseEvent) => {
    event.preventDefault();
    if (validate(step)) goTo(Math.min(step + 1, last));
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10 px-[6vw] py-12 md:px-8" ref={formRef}>
      <PageHead {...page} />

      <header className="flex flex-col gap-4">
        <div className="label text-primary">{t.kicker}</div>
        <h1 className="font-display text-[clamp(30px,4.6vw,56px)] font-extrabold uppercase leading-[.95] tracking-[-0.03em]">
          {t.title}
        </h1>
        <p className="max-w-[48ch] text-muted-foreground">{t.intro}</p>
      </header>

      <Form action={events_path(lp)} method="post" className="flex flex-col gap-10" resetOnSuccess={false} noValidate onBefore={() => validate()}
        onBlur={(event) => {
          // Focus moving into a picker's popover (the calendar, the time list) is not leaving the field.
          if (event.relatedTarget instanceof Element && event.relatedTarget.closest('[data-radix-popper-content-wrapper]')) return;
          refreshField(event.target, true);
        }}
        onChange={(event) => refreshField(event.target)}
        onError={() => { touched.current.clear(); setClientErrors({}); }}>
        {({ errors: serverErrors, processing, clearErrors }) => {
          const errors: Errors = { ...serverErrors, ...clientErrors };
          // The commune and coordinates come with the address; the address field speaks for them.
          errors.address ??= serverErrors.commune ?? serverErrors.latitude ?? serverErrors.longitude;
          return (<>
            <Stepper current={step} furthest={furthest} onGo={goTo} />
            <Step index={0} current={step}>
              <SectionTitle title={t.organizer} hint={t.organizerHint} />
              <div className="grid gap-6 sm:grid-cols-2">
                <Field label={t.companyName} htmlFor="company_name" errors={errors} name="company_name">
                  <Input id="company_name" name="event[company_name]" defaultValue={pre.company_name} placeholder="Platanus" className={inputClass} />
                </Field>
                <Field label={t.website} htmlFor="company_website" errors={errors} name="company_website">
                  <Input id="company_website" name="event[company_website]" defaultValue={pre.company_website} type="url" placeholder={t.websitePlaceholder} className={inputClass} />
                </Field>
                <Field label={t.contactName} htmlFor="author_name" errors={errors} name="author_name">
                  <Input id="author_name" name="event[author_name]" defaultValue={pre.author_name} placeholder="Ada Lovelace" className={inputClass} />
                </Field>
                <Field label={t.contactEmail} htmlFor="author_email" errors={errors} name="author_email" hint={t.contactEmailHint}>
                  <Input id="author_email" name="event[author_email]" defaultValue={pre.author_email} type="email" placeholder={t.emailPlaceholder} className={inputClass} />
                </Field>
                <Field label={t.contactPhone} htmlFor="author_phone_number" errors={errors} name="author_phone_number">
                  <Input id="author_phone_number" name="event[author_phone_number]" defaultValue={pre.author_phone_number} type="tel" placeholder="+56 9 8765 4321" className={inputClass} />
                </Field>
              </div>
            </Step>

            <Step index={1} current={step}>
              <SectionTitle title={t.event} hint={t.eventHint} />
              <Field label={t.eventTitle} htmlFor="title" errors={errors} name="title">
                <Input id="title" name="event[title]" defaultValue={pre.title} placeholder={t.eventTitlePlaceholder} className={inputClass} />
              </Field>
              <Field label={t.description} htmlFor="description" errors={errors} name="description" hint={t.characters(description.length, descriptionLimit)}>
                <Textarea
                  id="description"
                  name="event[description]"
                  placeholder={t.descriptionPlaceholder}
                  maxLength={descriptionLimit}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-28 border-input bg-transparent px-3 text-base focus-visible:border-primary focus-visible:ring-0"
                />
              </Field>

              <div className="flex flex-col gap-2 rounded-sm border border-border p-4">
                <div className="label text-[11px] text-muted-foreground">{t.week}</div>
                <div className="grid grid-cols-7 gap-1">
                  {days.map((day) => (
                    <div key={day.date} className="flex flex-col items-center gap-1 text-center">
                      <span className="font-display text-[11px] font-extrabold uppercase">{day.label}</span>
                      <span className="text-xs text-muted-foreground">{day.count}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">{t.weekNote}</p>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <Field label={t.start} htmlFor="starts_at" errors={errors} name="starts_at" className="min-w-0">
                  <DateTimeField id="starts_at" name="event[starts_at]" min={weekDates.from} max={weekDates.to} value={startsAt} onChange={onStartChange} className={pickerClass} popoverClassName={popoverClass} />
                </Field>
                <Field label={t.end} htmlFor="ends_at" errors={errors} name="ends_at" className="min-w-0">
                  <DateTimeField id="ends_at" name="event[ends_at]" min={weekDates.from} max={weekDates.to} value={endsAt} onChange={onEndChange} className={pickerClass} popoverClassName={popoverClass} />
                </Field>
              </div>
              {durationWarning && <p className="text-sm text-primary">{durationWarning}</p>}

              <Field label={t.address} htmlFor="address" errors={errors} name="address" hint={t.addressHint}>
                <AddressInput id="address" prefix="event" initial={prefilledPlace(pre)} className={inputClass} onPick={() => refreshById('address')} />
              </Field>

              <div className="grid gap-6 sm:grid-cols-2">
                <Field label={t.format} htmlFor="format" errors={errors} name="format">
                  <Select name="event[format]" defaultValue={pre.format}>
                    <SelectTrigger aria-invalid={!!errors.format} aria-describedby={errors.format ? "format-error" : undefined} id="format" className={selectClass}>
                      <SelectValue placeholder={t.formatPlaceholder} />
                    </SelectTrigger>
                    <SelectContent className="site min-h-0 border-border bg-popover text-popover-foreground">
                      {formats.map((format) => (
                        <SelectItem key={format} value={format}>
                          {FORMAT_LABELS[locale][format]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label={t.capacity} htmlFor="capacity" errors={errors} name="capacity" hint={t.capacityHint}>
                  <Input id="capacity" name="event[capacity]" defaultValue={pre.capacity} type="number" min={1} max={500000} step={1} placeholder="50" className={inputClass} />
                </Field>
              </div>

              <LogoField onValidation={(input) => refreshField(input, true)} name="event[logo_upload]" label={t.logo} errors={errors} errorName="logo" />
            </Step>

            <Step index={2} current={step}>
              <SectionTitle title={t.catalogue} hint={t.catalogueHint} />
              <div className="flex flex-col gap-2">
                <div className="label text-[11px] text-muted-foreground">{t.themesPick}</div>
                <CheckboxGrid name="event[theme_ids][]" options={themes} checked={pre.theme_ids} errors={errors} errorName="themes" label={t.themes} />
              </div>
              <div className="flex flex-col gap-2">
                <div className="label text-[11px] text-muted-foreground">{t.audiencesPick}</div>
                <CheckboxGrid name="event[audience_ids][]" options={audiences} checked={pre.audience_ids} errors={errors} errorName="audiences" label={t.audiences} />
              </div>
            </Step>

            <Step index={3} current={step}>
              <SectionTitle title={t.cohosts} />
              <p className="text-sm text-muted-foreground">{t.cohostsIntro}</p>
              {cohostIds.map((cohostId, index) => {
                const prefix = `event[cohosts_attributes][${index}]`;
                const err = (field: string) => `cohosts[${index}].${field}`;
                return (
                  <div key={cohostId} className="flex flex-col gap-6 rounded-sm border border-border p-5">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-sm font-extrabold uppercase tracking-[-0.02em]">{t.cohost(index + 1)}</h3>
                      <Button type="button" variant="ghost" size="sm" onClick={() => {
                        setCohostIds(cohostIds.filter((id) => id !== cohostId));
                        touched.current = new Set([...touched.current].filter((key) => !key.startsWith('cohosts[')));
                        setClientErrors((previous) => Object.fromEntries(Object.entries(previous).filter(([key]) => !key.startsWith('cohosts['))));
                        clearErrors(...Object.keys(serverErrors).filter((key) => key.startsWith('cohosts[')));
                      }}>
                        <Trash2 />
                        {t.remove}
                      </Button>
                    </div>
                    <div className="grid gap-6 sm:grid-cols-2">
                      <Field label={t.companyName} htmlFor={`cohost_${cohostId}_company_name`} errors={errors} name={err('company_name')}>
                        <Input id={`cohost_${cohostId}_company_name`} name={`${prefix}[company_name]`} className={inputClass} />
                      </Field>
                      <Field label={t.contactName} htmlFor={`cohost_${cohostId}_contact_name`} errors={errors} name={err('primary_contact_name')}>
                        <Input id={`cohost_${cohostId}_contact_name`} name={`${prefix}[primary_contact_name]`} className={inputClass} />
                      </Field>
                      <Field label={t.contactEmail} htmlFor={`cohost_${cohostId}_contact_email`} errors={errors} name={err('primary_contact_email')} hint={t.cohostEmailHint}>
                        <Input id={`cohost_${cohostId}_contact_email`} name={`${prefix}[primary_contact_email]`} type="email" className={inputClass} />
                      </Field>
                      <Field label={t.phoneOptional} htmlFor={`cohost_${cohostId}_phone`} errors={errors} name={err('primary_contact_phone_number')}>
                        <Input id={`cohost_${cohostId}_phone`} name={`${prefix}[primary_contact_phone_number]`} type="tel" placeholder="+56 9 8765 4321" className={inputClass} />
                      </Field>
                      <Field label={t.websiteOptional} htmlFor={`cohost_${cohostId}_website`} errors={errors} name={err('primary_contact_website')}>
                        <Input id={`cohost_${cohostId}_website`} name={`${prefix}[primary_contact_website]`} type="url" placeholder={t.websitePlaceholder} className={inputClass} />
                      </Field>
                      <Field label={t.linkedinOptional} htmlFor={`cohost_${cohostId}_linkedin`} errors={errors} name={err('primary_contact_linkedin')}>
                        <Input id={`cohost_${cohostId}_linkedin`} name={`${prefix}[primary_contact_linkedin]`} type="url" placeholder={t.linkedinPlaceholder} className={inputClass} />
                      </Field>
                    </div>
                    <LogoField onValidation={(input) => refreshField(input, true)} name={`${prefix}[logo_upload]`} label={t.logo} errors={errors} errorName={err('company_logo_url')} />
                  </div>
                );
              })}
              <Button
                type="button"
                variant="outline"
                className="self-start"
                onClick={() => {
                  setCohostIds([...cohostIds, nextCohostId]);
                  setNextCohostId(nextCohostId + 1);
                }}
              >
                <Plus />
                {t.addCohost}
              </Button>
            </Step>

            <ErrorStep errors={serverErrors} onGo={goTo} />

            <div className="flex flex-wrap items-center gap-4 border-t border-border pt-8">
              {step > 0 && (
                <Button type="button" variant="outline" size="lg" onClick={() => goTo(step - 1)}>
                  <ArrowLeft />
                  {t.back}
                </Button>
              )}
              {step < last ? (
                <Button key="next" type="button" size="lg" onClick={nextStep} className="font-display text-[12px] font-extrabold uppercase tracking-[.04em]">
                  {t.continue}
                  <ArrowRight />
                </Button>
              ) : (
                <Button key="submit" type="submit" disabled={processing} size="lg" className="font-display text-[12px] font-extrabold uppercase tracking-[.04em]">
                  {processing ? t.sending : t.submit}
                </Button>
              )}
              <Link href={events_path(lp)} className="label text-muted-foreground hover:text-foreground">
                {t.cancel}
              </Link>
              <p className="label w-full text-muted-foreground sm:w-auto sm:flex-1 sm:text-right">
                {t.stepOf(step + 1, STEPS.length)}
              </p>
              {Object.values(errors).some(Boolean) && (
                <p className="w-full text-sm text-primary">{t.review}</p>
              )}
            </div>
          </>);
        }}
      </Form>
    </div>
  );
}
