import { Form, Link } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, Check, Plus, Trash2, Upload } from 'lucide-react';
import { type ChangeEvent, type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { FORMAT_LABELS } from '@/components/events/formats';
import { PageHead } from '@/components/site/layout';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { events_path } from '@/routes';
import type { EventsNew } from '@/types';

type Errors = Record<string, string[] | string | undefined>;

const LOGO_TYPES = 'image/jpeg,image/png,image/webp';
const LOGO_MAX_BYTES = 2 * 1024 * 1024;

function FieldError({ errors, name }: { errors: Errors; name: string }) {
  const error = errors[name];
  if (!error) return null;
  return <p className="text-sm text-primary">{Array.isArray(error) ? error.join('. ') : error}</p>;
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
    <div className={cn('flex flex-col gap-2', className)}>
      <Label htmlFor={htmlFor} className="label text-[11px] text-muted-foreground">
        {label}
      </Label>
      {children}
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
    <section className="flex flex-col gap-6" style={index === current ? undefined : {display: 'none'}}>
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

// A logo picker: the file input, its preview on black (where the site shows it), the file name
// and size, and a size/type check before the server's.
function LogoField({ name, label, errors, errorName }: { name: string; label: string; errors: Errors; errorName: string }) {
  const id = useId();
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setPreview(null);
      setFileName(null);
      setProblem(null);
      return;
    }
    setFileName(`${file.name} · ${Math.round(file.size / 1024)} KB`);
    setProblem(
      file.size > LOGO_MAX_BYTES
        ? 'El logo debe pesar menos de 2 MB.'
        : !LOGO_TYPES.split(',').includes(file.type)
          ? 'El logo debe ser JPEG, PNG o WebP.'
          : null,
    );
    setPreview(URL.createObjectURL(file));
  };

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id} className="label text-[11px] text-muted-foreground">
        {label}
      </Label>
      <div className="flex flex-wrap items-center gap-4">
        <label
          htmlFor={id}
          className="flex size-24 shrink-0 cursor-pointer items-center justify-center rounded-sm border border-dashed border-input bg-black transition-colors hover:border-foreground"
        >
          {preview ? (
            <img src={preview} alt="" className="max-h-full max-w-full object-contain p-2" />
          ) : (
            <Upload className="size-5 text-muted-foreground" />
          )}
        </label>
        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
          <input id={id} name={name} type="file" accept={LOGO_TYPES} onChange={onChange} className="text-sm text-foreground file:mr-3 file:rounded-sm file:border file:border-border file:bg-transparent file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-foreground" />
          <span>JPEG, PNG o WebP · máximo 2 MB · se muestra sobre negro</span>
          {fileName && <span className="text-foreground">{fileName}</span>}
        </div>
      </div>
      {problem && <p className="text-sm text-primary">{problem}</p>}
      <FieldError errors={errors} name={errorName} />
    </div>
  );
}

// The catalogue pickers (temas, audiencias): a grid of checkboxes posting `name[]`.
function CheckboxGrid({ name, options, errors, errorName }: {
  name: string;
  options: { id: string; name: string }[];
  errors: Errors;
  errorName: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2 md:grid-cols-3">
        {options.map((option) => (
          <label key={option.id} className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox name={name} value={option.id} />
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
export default function New({ days, week, communes, formats, themes, audiences, descriptionLimit, ...page }: EventsNew) {
  const [description, setDescription] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [cohostIds, setCohostIds] = useState<number[]>([]);
  const [nextCohostId, setNextCohostId] = useState(0);

  const min = `${week.from}T00:00`;
  const max = `${week.to}T23:59`;

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

  // The browser's own checks on the fields of this step only (type=email, type=url, a number
  // out of range). Nothing is marked required, so a hidden step can never block the submit;
  // what a field must actually hold is the server's call, in Spanish.
  // The click is stopped explicitly, and the two buttons below carry keys: without either,
  // React reuses one DOM node for "Continuar" and "Enviar evento", so by the time the browser
  // performs the click's default action the node has already turned into the submit button
  // and the form goes off a step early.
  const nextStep = (event: React.MouseEvent) => {
    event.preventDefault();
    const fields = formRef.current?.querySelectorAll<HTMLInputElement>('section:not([style]) input, section:not([style]) textarea');
    for (const field of fields ?? []) {
      if (!field.checkValidity()) {
        field.reportValidity();
        return;
      }
    }
    goTo(Math.min(step + 1, last));
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

      <Form action={events_path()} method="post" className="flex flex-col gap-10" resetOnSuccess={false}>
        {({ errors, processing }) => (
          <>
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
                    <SelectTrigger id="commune" className={selectClass}>
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
                    <SelectTrigger id="format" className={selectClass}>
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
                  <Input id="capacity" name="event[capacity]" type="number" min={1} placeholder="50" className={inputClass} />
                </Field>
              </div>

              <LogoField name="event[logo_upload]" label="Logo de la empresa" errors={errors} errorName="logo" />
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
                      <Button type="button" variant="ghost" size="sm" onClick={() => setCohostIds(cohostIds.filter((id) => id !== cohostId))}>
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
                    <LogoField name={`${prefix}[logo_upload]`} label="Logo de la empresa" errors={errors} errorName={err('company_logo_url')} />
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

            <ErrorStep errors={errors} onGo={goTo} />

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
              {Object.keys(errors).length > 0 && (
                <p className="w-full text-sm text-primary">Revisa los campos marcados: hay datos que faltan o no son válidos.</p>
              )}
            </div>
          </>
        )}
      </Form>
    </div>
  );
}
