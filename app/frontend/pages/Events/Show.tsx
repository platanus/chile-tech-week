import { Link, router, usePage } from '@inertiajs/react';
import { ArrowUpRight, Check, Circle, Hourglass } from 'lucide-react';
import { useState } from 'react';
import { formatLongDay, formatTime } from '@/components/events/dates';
import { FORMAT_LABELS } from '@/components/events/formats';
import { PageHead } from '@/components/site/layout';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { copy, useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { new_event_path, publish_event_path } from '@/routes';
import type { EventStatus, EventsShow } from '@/types';

const COPY = copy(
  {
    steps: [
      { number: 1, title: 'Enviar evento', description: 'Recibimos tu evento.' },
      { number: 2, title: 'Revisión y aprobación', description: 'El equipo revisa los datos.' },
      { number: 3, title: 'Editar Luma y publicar', description: 'Creamos tu evento en Luma; tú lo terminas.' },
      { number: 4, title: 'Evento publicado', description: 'En el programa de Chile Tech Week.' },
    ],
    status: {
      1: 'Estamos revisando tu evento. Cuando lo aprobemos, crearemos tu evento en Luma y te invitaremos a editarlo.',
      2: 'Tu evento fue aprobado. Estamos preparando tu evento en Luma.',
      3: 'Tu evento en Luma está listo para editar. Revisa tu correo: ahí están las instrucciones. Cuando termines, publícalo aquí.',
      4: '¡Tu evento está publicado en Chile Tech Week! Los cambios que hagas en Luma (título, fecha, hora) se sincronizan solos.',
    } as Record<number, string>,
    statusImported: 'Estamos revisando tu evento. Cuando lo aprobemos, lo agregaremos al programa y al calendario de Chile Tech Week.',
    summary: { hosts: 'Organiza', date: 'Fecha', time: 'Hora', address: 'Dirección', format: 'Formato', capacity: 'Capacidad', topics: 'Temas', audiences: 'Audiencias' },
    people: (n: number) => `${n} personas`,
    checklist: [
      'Verificar la fecha y la hora del evento',
      'Agregar imágenes del evento',
      'Confirmar la dirección del lugar',
      'Completar la descripción (y borrar el texto autogenerado)',
      'Editar tu perfil de Luma con el nombre y el logo de la empresa',
    ],
    beforeTitle: 'Antes de publicar',
    beforeText: 'Confirma que ya hiciste esto en tu evento de Luma:',
    cancel: 'Cancelar',
    next: 'Siguiente',
    readyTitle: 'Listo para publicar',
    readyText: 'Revisa los datos antes de publicar.',
    seeOnLuma: 'Ver en Luma',
    back: 'Atrás',
    publishing: 'Publicando…',
    publish: 'Publicar evento',
    keepPage: 'Guarda esta página: aquí verás el avance de tu evento. También te escribiremos a tu email.',
    kicker: 'Tu evento · Chile Tech Week 2026',
    deletedTitle: 'Este evento fue dado de baja',
    deletedText: 'El evento ya no está activo. Si fue un error, escríbenos; si quieres, envía uno nuevo.',
    submitNew: 'Enviar un evento nuevo',
    rejectedTitle: 'Tu evento necesita cambios',
    rejectedText: 'Corrige lo indicado y vuelve a enviarlo.',
    submitAgain: 'Enviar de nuevo',
    stepOf: (step: number, total: number) => `Estado · paso ${step} de ${total}`,
    editedPublish: 'Ya edité Luma · Publicar evento',
    editOnLuma: 'Editar en Luma',
    seeEvent: 'Ver evento',
    process: 'Proceso',
    done: 'Completado',
    active: 'En curso',
    pending: 'Pendiente',
    image: 'Imagen del evento',
    cover: (title: string) => `Portada de ${title}`,
    coverNote: 'Es la portada de tu evento en Luma. Si la cambias allá, se actualiza acá.',
    summaryTitle: 'Resumen',
  },
  {
    steps: [
      { number: 1, title: 'Submit event', description: 'We received your event.' },
      { number: 2, title: 'Review and approval', description: 'The team reviews the details.' },
      { number: 3, title: 'Edit Luma and publish', description: 'We create your event on Luma; you finish it.' },
      { number: 4, title: 'Event published', description: 'In the Chile Tech Week programme.' },
    ],
    status: {
      1: "We're reviewing your event. Once we approve it, we'll create your event on Luma and invite you to edit it.",
      2: "Your event was approved. We're setting up your event on Luma.",
      3: "Your Luma event is ready to edit. Check your email for the instructions. When you're done, publish it here.",
      4: 'Your event is published on Chile Tech Week! Changes you make on Luma (title, date, time) sync by themselves.',
    },
    statusImported: "We're reviewing your event. Once we approve it, we'll add it to the Chile Tech Week programme and calendar.",
    summary: { hosts: 'Hosted by', date: 'Date', time: 'Time', address: 'Address', format: 'Format', capacity: 'Capacity', topics: 'Topics', audiences: 'Audiences' },
    people: (n: number) => `${n} people`,
    checklist: [
      "Check the event's date and time",
      'Add images of the event',
      "Confirm the venue's address",
      'Complete the description (and delete the auto-generated text)',
      "Edit your Luma profile with the company's name and logo",
    ],
    beforeTitle: 'Before publishing',
    beforeText: "Confirm you've done this on your Luma event:",
    cancel: 'Cancel',
    next: 'Next',
    readyTitle: 'Ready to publish',
    readyText: 'Review the details before publishing.',
    seeOnLuma: 'See on Luma',
    back: 'Back',
    publishing: 'Publishing…',
    publish: 'Publish event',
    keepPage: "Save this page: you'll follow your event's progress here. We'll also write to your email.",
    kicker: 'Your event · Chile Tech Week 2026',
    deletedTitle: 'This event was taken down',
    deletedText: "The event is no longer active. If it was a mistake, write to us; if you'd like, submit a new one.",
    submitNew: 'Submit a new event',
    rejectedTitle: 'Your event needs changes',
    rejectedText: 'Fix what we pointed out and submit it again.',
    submitAgain: 'Submit again',
    stepOf: (step: number, total: number) => `Status · step ${step} of ${total}`,
    editedPublish: "I've edited Luma · Publish event",
    editOnLuma: 'Edit on Luma',
    seeEvent: 'See event',
    process: 'Process',
    done: 'Done',
    active: 'In progress',
    pending: 'Pending',
    image: 'Event image',
    cover: (title: string) => `Cover of ${title}`,
    coverNote: "It's your event's cover on Luma. If you change it there, it updates here.",
    summaryTitle: 'Summary',
  },
);

function stepState(step: number, current: number): 'done' | 'active' | 'pending' {
  if (step < current || current === 4) return 'done';
  if (step === current || (step === 2 && current === 1)) return 'active';
  return 'pending';
}

function Summary({ event }: { event: EventStatus }) {
  const { t, locale } = useI18n(COPY);
  const rows: [string, React.ReactNode][] = [
    [t.summary.hosts, `${event.companyName}${event.cohosts.length ? ` + ${event.cohosts.map((c) => c.companyName).join(' + ')}` : ''}`],
    [t.summary.date, formatLongDay(event.startsAt, locale)],
    [t.summary.time, `${formatTime(event.startsAt)} – ${formatTime(event.endsAt)}`],
    [t.summary.address, event.address ?? event.commune],
    [t.summary.format, FORMAT_LABELS[locale][event.format]],
    [t.summary.capacity, t.people(event.capacity)],
    [t.summary.topics, event.themes.map((theme) => theme.name).join(', ')],
    [t.summary.audiences, event.audiences.map((a) => a.name).join(', ')],
  ];
  return (
    <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-[8rem_1fr]">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="label text-[11px] text-muted-foreground sm:pt-0.5">{label}</dt>
          <dd className="text-sm">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

// The publish dialog: the checklist of what to finish on Luma, then the summary and the button.
function PublishDialog({ event, open, onOpenChange }: { event: EventStatus; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t, lp } = useI18n(COPY);
  const [step, setStep] = useState<1 | 2>(1);
  const [publishing, setPublishing] = useState(false);

  const close = (value: boolean) => {
    if (!value) setStep(1);
    onOpenChange(value);
  };

  const publish = () => {
    setPublishing(true);
    router.post(publish_event_path(event.id, lp), {}, { onFinish: () => setPublishing(false), onSuccess: () => close(false) });
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="site min-h-0 max-w-lg border-border bg-card text-card-foreground">
        {step === 1 ? (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-lg font-extrabold uppercase tracking-[-0.02em]">{t.beforeTitle}</DialogTitle>
              <DialogDescription>{t.beforeText}</DialogDescription>
            </DialogHeader>
            <ul className="flex flex-col gap-3 py-2">
              {t.checklist.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm">
                  <span className="mt-0.5 size-4 shrink-0 rounded-sm border border-input" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => close(false)}>
                {t.cancel}
              </Button>
              <Button type="button" onClick={() => setStep(2)}>
                {t.next}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-lg font-extrabold uppercase tracking-[-0.02em]">{t.readyTitle}</DialogTitle>
              <DialogDescription>{t.readyText}</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-2">
              <p className="font-display text-base font-extrabold uppercase tracking-[-0.02em]">{event.title}</p>
              <Summary event={event} />
              {event.lumaEventUrl && (
                <a href={event.lumaEventUrl} target="_blank" rel="noopener noreferrer" className="label text-primary hover:underline">
                  {t.seeOnLuma}
                </a>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setStep(1)} disabled={publishing}>
                {t.back}
              </Button>
              <Button type="button" onClick={publish} disabled={publishing}>
                {publishing ? t.publishing : t.publish}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// /events/:id — where the host follows the review: the current step, the four steps, the
// event's summary, and at step 3 the publish dialog.
export default function Show({ event, openPublish, ...page }: EventsShow) {
  const { t, lp } = useI18n(COPY);
  const { flash } = usePage().props;
  const [publishOpen, setPublishOpen] = useState(openPublish);
  const rejected = event.state === 'rejected';
  const deleted = event.state === 'deleted';

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10 px-[6vw] py-12 md:px-8">
      <PageHead {...page} />

      {flash.notice && (
        <div className="flex flex-col gap-1 rounded-sm border border-primary px-5 py-4" role="status">
          <p className="font-display text-base font-extrabold uppercase tracking-[-0.02em]">{flash.notice}</p>
          {event.step === 1 && !rejected && (
            <p className="text-sm text-muted-foreground">{t.keepPage}</p>
          )}
        </div>
      )}
      {flash.alert && (
        <div className="rounded-sm border border-primary px-5 py-4 text-sm" role="alert">
          {flash.alert}
        </div>
      )}

      <header className="flex flex-col gap-4">
        <div className="label text-primary">{t.kicker}</div>
        <h1 className="font-display text-[clamp(26px,3.6vw,44px)] font-extrabold uppercase leading-[.95] tracking-[-0.03em]">
          {event.title}
        </h1>
      </header>

      {deleted ? (
        <section className="flex flex-col items-start gap-4 border-t border-border pt-8">
          <h2 className="font-display text-lg font-extrabold uppercase tracking-[-0.02em]">{t.deletedTitle}</h2>
          <p className="max-w-[48ch] text-sm text-muted-foreground">{t.deletedText}</p>
          <Button asChild>
            <Link href={new_event_path(lp)}>{t.submitNew}</Link>
          </Button>
        </section>
      ) : rejected ? (
        <section className="flex flex-col items-start gap-4 border-t border-border pt-8">
          <h2 className="font-display text-lg font-extrabold uppercase tracking-[-0.02em]">{t.rejectedTitle}</h2>
          {event.rejectionReason && <p className="max-w-[56ch] whitespace-pre-wrap text-sm">{event.rejectionReason}</p>}
          <p className="max-w-[48ch] text-sm text-muted-foreground">{t.rejectedText}</p>
          <Button asChild>
            <Link href={new_event_path(lp)}>{t.submitAgain}</Link>
          </Button>
        </section>
      ) : (
        <>
          <section className="flex flex-col gap-3 border-t border-border pt-8">
            <div className="label text-muted-foreground">{event.lumaImported ? t.stepOf(Math.min(event.step, 3), 3) : t.stepOf(event.step, 4)}</div>
            <p className="max-w-[56ch] text-base">{event.lumaImported && event.step === 1 ? t.statusImported : t.status[event.step]}</p>
            {event.step === 3 && (
              <div className="mt-2 flex flex-wrap items-center gap-4">
                <Button type="button" onClick={() => setPublishOpen(true)}>
                  {t.editedPublish}
                </Button>
                {event.lumaEventUrl && (
                  <a href={event.lumaEventUrl} target="_blank" rel="noopener noreferrer" className="label inline-flex items-center gap-1 text-primary hover:underline">
                    {t.editOnLuma} <ArrowUpRight className="size-3" />
                  </a>
                )}
              </div>
            )}
            {event.step === 4 && event.registrationUrl && (
              <a href={event.registrationUrl} target="_blank" rel="noopener noreferrer" className="label inline-flex items-center gap-1 self-start text-primary hover:underline">
                {t.seeEvent} <ArrowUpRight className="size-3" />
              </a>
            )}
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="label text-muted-foreground">{t.process}</h2>
            <ol className="flex flex-col">
              {t.steps.filter((step) => !(event.lumaImported && step.number === 3)).map((step, index) => {
                const state = stepState(step.number, event.step);
                return (
                  <li key={step.number} className={cn('flex items-start gap-4 border-b border-border py-4 first:border-t', state === 'pending' && 'text-muted-foreground')}>
                    <span className={cn('mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border', state === 'done' ? 'border-primary bg-primary text-white' : state === 'active' ? 'border-primary text-primary' : 'border-border')}>
                      {state === 'done' ? <Check className="size-3.5" /> : state === 'active' ? <Hourglass className="size-3" /> : <Circle className="size-2" />}
                    </span>
                    <div className="flex flex-1 flex-col gap-0.5">
                      <span className="font-display text-sm font-extrabold uppercase tracking-[-0.02em]">
                        {index + 1}. {step.title}
                      </span>
                      <span className="text-xs">{step.description}</span>
                    </div>
                    <span className="label text-[10px]">
                      {state === 'done' ? t.done : state === 'active' ? t.active : t.pending}
                    </span>
                  </li>
                );
              })}
            </ol>
          </section>
        </>
      )}

      {event.coverImageUrl && (
        <section className="flex flex-col gap-4">
          <h2 className="label text-muted-foreground">{t.image}</h2>
          <img
            src={event.coverImageUrl}
            alt={t.cover(event.title)}
            className="max-h-72 w-auto max-w-full self-start rounded-sm border border-border object-contain"
          />
          <p className="text-xs text-muted-foreground">
            {t.coverNote}
          </p>
        </section>
      )}

      <section className="flex flex-col gap-4">
        <h2 className="label text-muted-foreground">{t.summaryTitle}</h2>
        <div className="flex flex-col gap-6 rounded-sm border border-border p-5 sm:flex-row sm:items-start">
          <div className="flex size-20 shrink-0 items-center justify-center rounded-sm border border-border bg-black">
            <img src={event.companyLogoUrl} alt={event.companyName} className="max-h-full max-w-full object-contain p-2" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <p className="text-sm">{event.description}</p>
            <Summary event={event} />
          </div>
        </div>
      </section>

      {event.step === 3 && <PublishDialog event={event} open={publishOpen} onOpenChange={setPublishOpen} />}
    </div>
  );
}
