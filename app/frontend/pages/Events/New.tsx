import { Form, Link } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, Check, Plus, Trash2 } from 'lucide-react';
import { cloneElement, type ReactElement, type ReactNode, useEffect, useRef, useState } from 'react';
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
import { cn } from '@/lib/utils';
import { events_path } from '@/routes';
import type { EventsNew } from '@/types';

type Errors = Record<string, string[] | string | undefined>;

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
  {title: 'Organizador', fields: ['company_name', 'company_website', 'author_name', 'author_email', 'author_phone_number']},
  {title: 'Evento', fields: ['title', 'description', 'starts_at', 'ends_at', 'commune', 'format', 'capacity', 'logo']},
  {title: 'Temas y audiencias', fields: ['themes', 'audiences']},
  {title: 'Co-hosts', fields: []}
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
  return (
    <ol className="flex flex-wrap gap-x-6 gap-y-2 border-b border-border pb-4">
      {STEPS.map((step, index) => {
        const done = index < furthest;
        const reachable = index <= furthest;
        return (
          <li key={step.title}>
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
              {step.title}
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
function CheckboxGrid({ name, options, errors, errorName }: {
  name: string;
  options: { id: string; name: string }[];
  errors: Errors;
  errorName: string;
}) {
  return (
    <div data-field={errorName} role="group" aria-label={errorName === 'themes' ? 'Temas' : 'Audiencias'} aria-describedby={errors[errorName] ? `${errorName}-error` : undefined} className="flex flex-col gap-2">
      <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2 md:grid-cols-3">
        {options.map((option) => (
          <label key={option.id} className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox name={name} value={option.id} aria-invalid={!!errors[errorName]} />
            {option.name}
          </label>
        ))}
      </div>
      <FieldError errors={errors} name={errorName} />
    </div>
  );
}

// datetime-local ↔ the "YYYY-MM-DDTHH:MM" strings it speaks, no zone (the server reads them
// in Santiago time).
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

const inputClass = 'h-11 border-input bg-transparent px-3 text-base focus-visible:border-primary focus-visible:ring-0';
const selectClass = 'h-11! w-full border-input bg-transparent px-3 text-base focus-visible:border-primary focus-visible:ring-0';

// The submission form: the organiser, the event, the catalogue and the optional co-hosts,
// posted as one Rails nested form (event[…], event[cohosts_attributes][i][…]).
export default function New({ days, weekDates, communes, formats, themes, audiences, descriptionLimit, ...page }: EventsNew) {
  const [description, setDescription] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [cohostIds, setCohostIds] = useState<number[]>([]);
  const [nextCohostId, setNextCohostId] = useState(0);

  const min = `${weekDates.from}T00:00`;
  const max = `${weekDates.to}T23:59`;

  const onStartChange = (value: string) => {
    setStartsAt(value);
    if (value && (!endsAt || endsAt <= value)) setEndsAt(addHours(value, 2));
  };

  const duration = startsAt && endsAt ? hoursBetween(startsAt, endsAt) : null;
  const durationWarning =
    duration === null
      ? null
      : duration <= 0
        ? 'El término debe ser después del inicio.'
        : duration > 4
          ? `Este evento dura ${Math.round(duration)} horas. ¿Es correcto? La mayoría dura 4 horas o menos.`
          : null;

  const [step, setStep] = useState(0);
  const [furthest, setFurthest] = useState(0);
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
    const errors = validateEvent(new FormData(form), { weekDates, descriptionLimit, communes, formats });
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
    if (blur || target.matches('input[type="file"], input[type="checkbox"], [role="checkbox"], [role="combobox"]')) touched.current.add(key);
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

  const nextStep = (event: React.MouseEvent) => {
    event.preventDefault();
    if (validate(step)) goTo(Math.min(step + 1, last));
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10 px-[6vw] py-12 md:px-8" ref={formRef}>
      <PageHead {...page} />

      <header className="flex flex-col gap-4">
        <div className="label text-primary">16 al 22 de noviembre</div>
        <h1 className="font-display text-[clamp(30px,4.6vw,56px)] font-extrabold uppercase leading-[.95] tracking-[-0.03em]">
          Organiza un evento
        </h1>
        <p className="max-w-[48ch] text-muted-foreground">
          Cuéntanos de tu evento. Lo revisamos, creamos su página en Luma para que la edites y lo
          publicamos en el programa.
        </p>
      </header>

      <Form action={events_path()} method="post" className="flex flex-col gap-10" resetOnSuccess={false} noValidate onBefore={() => validate()}
        onBlur={(event) => refreshField(event.target, true)}
        onChange={(event) => refreshField(event.target)}
        onError={() => { touched.current.clear(); setClientErrors({}); }}>
        {({ errors: serverErrors, processing, clearErrors }) => {
          const errors = { ...serverErrors, ...clientErrors };
          return (<>
            <Stepper current={step} furthest={furthest} onGo={goTo} />
            <Step index={0} current={step}>
              <SectionTitle title="Organizador" hint="Quién organiza y a quién le escribimos." />
              <div className="grid gap-6 sm:grid-cols-2">
                <Field label="Nombre de la empresa" htmlFor="company_name" errors={errors} name="company_name">
                  <Input id="company_name" name="event[company_name]" placeholder="Platanus" className={inputClass} />
                </Field>
                <Field label="Sitio web" htmlFor="company_website" errors={errors} name="company_website">
                  <Input id="company_website" name="event[company_website]" type="url" placeholder="https://empresa.cl" className={inputClass} />
                </Field>
                <Field label="Nombre de contacto" htmlFor="author_name" errors={errors} name="author_name">
                  <Input id="author_name" name="event[author_name]" placeholder="Ada Lovelace" className={inputClass} />
                </Field>
                <Field label="Email de contacto" htmlFor="author_email" errors={errors} name="author_email" hint="A este email llegarán las novedades de tu evento.">
                  <Input id="author_email" name="event[author_email]" type="email" placeholder="ada@empresa.cl" className={inputClass} />
                </Field>
                <Field label="Teléfono de contacto" htmlFor="author_phone_number" errors={errors} name="author_phone_number">
                  <Input id="author_phone_number" name="event[author_phone_number]" type="tel" placeholder="+56 9 8765 4321" className={inputClass} />
                </Field>
              </div>
            </Step>

            <Step index={1} current={step}>
              <SectionTitle title="Evento" hint="Qué es, cuándo y dónde." />
              <Field label="Título" htmlFor="title" errors={errors} name="title">
                <Input id="title" name="event[title]" placeholder="Demo Day de fintechs" className={inputClass} />
              </Field>
              <Field label="Descripción" htmlFor="description" errors={errors} name="description" hint={`${description.length}/${descriptionLimit} caracteres`}>
                <Textarea
                  id="description"
                  name="event[description]"
                  placeholder="Una descripción corta de tu evento"
                  maxLength={descriptionLimit}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-28 border-input bg-transparent px-3 text-base focus-visible:border-primary focus-visible:ring-0"
                />
              </Field>

              <div className="flex flex-col gap-2 rounded-sm border border-border p-4">
                <div className="label text-[11px] text-muted-foreground">Así va la semana</div>
                <div className="grid grid-cols-7 gap-1">
                  {days.map((day) => (
                    <div key={day.date} className="flex flex-col items-center gap-1 text-center">
                      <span className="font-display text-[11px] font-extrabold uppercase">{day.label}</span>
                      <span className="text-xs text-muted-foreground">{day.count}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">Eventos ya publicados por día.</p>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <Field label="Inicio" htmlFor="starts_at" errors={errors} name="starts_at">
                  <Input id="starts_at" name="event[starts_at]" type="datetime-local" min={min} max={max} value={startsAt} onChange={(e) => onStartChange(e.target.value)} className={cn(inputClass, 'scheme-dark')} />
                </Field>
                <Field label="Término" htmlFor="ends_at" errors={errors} name="ends_at">
                  <Input id="ends_at" name="event[ends_at]" type="datetime-local" min={min} max={max} value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className={cn(inputClass, 'scheme-dark')} />
                </Field>
              </div>
              {durationWarning && <p className="text-sm text-primary">{durationWarning}</p>}

              <div className="grid gap-6 sm:grid-cols-2">
                <Field label="Comuna" htmlFor="commune" errors={errors} name="commune">
                  <Select name="event[commune]">
                    <SelectTrigger aria-invalid={!!errors.commune} aria-describedby={errors.commune ? "commune-error" : undefined} id="commune" className={selectClass}>
                      <SelectValue placeholder="Elige una comuna" />
                    </SelectTrigger>
                    <SelectContent className="site min-h-0 border-border bg-popover text-popover-foreground">
                      {communes.map((commune) => (
                        <SelectItem key={commune} value={commune}>
                          {commune}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Formato" htmlFor="format" errors={errors} name="format">
                  <Select name="event[format]">
                    <SelectTrigger aria-invalid={!!errors.format} aria-describedby={errors.format ? "format-error" : undefined} id="format" className={selectClass}>
                      <SelectValue placeholder="Elige un formato" />
                    </SelectTrigger>
                    <SelectContent className="site min-h-0 border-border bg-popover text-popover-foreground">
                      {formats.map((format) => (
                        <SelectItem key={format} value={format}>
                          {FORMAT_LABELS[format]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Capacidad" htmlFor="capacity" errors={errors} name="capacity" hint="Cantidad aproximada de asistentes.">
                  <Input id="capacity" name="event[capacity]" type="number" min={1} max={500000} step={1} placeholder="50" className={inputClass} />
                </Field>
              </div>

              <LogoField onValidation={(input) => refreshField(input, true)} name="event[logo_upload]" label="Logo de la empresa" errors={errors} errorName="logo" />
            </Step>

            <Step index={2} current={step}>
              <SectionTitle title="Temas y audiencias" hint="Así la gente encuentra tu evento en el programa." />
              <div className="flex flex-col gap-2">
                <div className="label text-[11px] text-muted-foreground">Temas · elige al menos uno</div>
                <CheckboxGrid name="event[theme_ids][]" options={themes} errors={errors} errorName="themes" />
              </div>
              <div className="flex flex-col gap-2">
                <div className="label text-[11px] text-muted-foreground">Audiencias · elige al menos una</div>
                <CheckboxGrid name="event[audience_ids][]" options={audiences} errors={errors} errorName="audiences" />
              </div>
            </Step>

            <Step index={3} current={step}>
              <SectionTitle title="Co-hosts (opcional)" />
              <p className="text-sm text-muted-foreground">
                Las empresas que organizan el evento contigo. Cada contacto recibe la invitación de
                editor en Luma.
              </p>
              {cohostIds.map((cohostId, index) => {
                const prefix = `event[cohosts_attributes][${index}]`;
                const err = (field: string) => `cohosts[${index}].${field}`;
                return (
                  <div key={cohostId} className="flex flex-col gap-6 rounded-sm border border-border p-5">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-sm font-extrabold uppercase tracking-[-0.02em]">Co-host {index + 1}</h3>
                      <Button type="button" variant="ghost" size="sm" onClick={() => {
                        setCohostIds(cohostIds.filter((id) => id !== cohostId));
                        touched.current = new Set([...touched.current].filter((key) => !key.startsWith('cohosts[')));
                        setClientErrors((previous) => Object.fromEntries(Object.entries(previous).filter(([key]) => !key.startsWith('cohosts['))));
                        clearErrors(...Object.keys(serverErrors).filter((key) => key.startsWith('cohosts[')));
                      }}>
                        <Trash2 />
                        Quitar
                      </Button>
                    </div>
                    <div className="grid gap-6 sm:grid-cols-2">
                      <Field label="Nombre de la empresa" htmlFor={`cohost_${cohostId}_company_name`} errors={errors} name={err('company_name')}>
                        <Input id={`cohost_${cohostId}_company_name`} name={`${prefix}[company_name]`} className={inputClass} />
                      </Field>
                      <Field label="Nombre de contacto" htmlFor={`cohost_${cohostId}_contact_name`} errors={errors} name={err('primary_contact_name')}>
                        <Input id={`cohost_${cohostId}_contact_name`} name={`${prefix}[primary_contact_name]`} className={inputClass} />
                      </Field>
                      <Field label="Email de contacto" htmlFor={`cohost_${cohostId}_contact_email`} errors={errors} name={err('primary_contact_email')} hint="A este email llegará la invitación de editor en Luma.">
                        <Input id={`cohost_${cohostId}_contact_email`} name={`${prefix}[primary_contact_email]`} type="email" className={inputClass} />
                      </Field>
                      <Field label="Teléfono (opcional)" htmlFor={`cohost_${cohostId}_phone`} errors={errors} name={err('primary_contact_phone_number')}>
                        <Input id={`cohost_${cohostId}_phone`} name={`${prefix}[primary_contact_phone_number]`} type="tel" placeholder="+56 9 8765 4321" className={inputClass} />
                      </Field>
                      <Field label="Sitio web (opcional)" htmlFor={`cohost_${cohostId}_website`} errors={errors} name={err('primary_contact_website')}>
                        <Input id={`cohost_${cohostId}_website`} name={`${prefix}[primary_contact_website]`} type="url" placeholder="https://empresa.cl" className={inputClass} />
                      </Field>
                      <Field label="LinkedIn (opcional)" htmlFor={`cohost_${cohostId}_linkedin`} errors={errors} name={err('primary_contact_linkedin')}>
                        <Input id={`cohost_${cohostId}_linkedin`} name={`${prefix}[primary_contact_linkedin]`} type="url" placeholder="https://linkedin.com/in/usuario" className={inputClass} />
                      </Field>
                    </div>
                    <LogoField onValidation={(input) => refreshField(input, true)} name={`${prefix}[logo_upload]`} label="Logo de la empresa" errors={errors} errorName={err('company_logo_url')} />
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
                Agregar co-host
              </Button>
            </Step>

            <ErrorStep errors={serverErrors} onGo={goTo} />

            <div className="flex flex-wrap items-center gap-4 border-t border-border pt-8">
              {step > 0 && (
                <Button type="button" variant="outline" size="lg" onClick={() => goTo(step - 1)}>
                  <ArrowLeft />
                  Atrás
                </Button>
              )}
              {step < last ? (
                <Button key="next" type="button" size="lg" onClick={nextStep} className="font-display text-[12px] font-extrabold uppercase tracking-[.04em]">
                  Continuar
                  <ArrowRight />
                </Button>
              ) : (
                <Button key="submit" type="submit" disabled={processing} size="lg" className="font-display text-[12px] font-extrabold uppercase tracking-[.04em]">
                  {processing ? 'Enviando…' : 'Enviar evento'}
                </Button>
              )}
              <Link href={events_path()} className="label text-muted-foreground hover:text-foreground">
                Cancelar
              </Link>
              <p className="label w-full text-muted-foreground sm:w-auto sm:flex-1 sm:text-right">
                Paso {step + 1} de {STEPS.length}
              </p>
              {Object.values(errors).some(Boolean) && (
                <p className="w-full text-sm text-primary">Revisa los campos marcados: hay datos que faltan o no son válidos.</p>
              )}
            </div>
          </>);
        }}
      </Form>
    </div>
  );
}
