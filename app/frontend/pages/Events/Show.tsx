import { Link, router, usePage } from '@inertiajs/react';
import { ArrowUpRight, Check, Circle, Hourglass } from 'lucide-react';
import { useState } from 'react';
import { formatLongDay, formatTime } from '@/components/events/dates';
import { FORMAT_LABELS } from '@/components/events/formats';
import { PageHead } from '@/components/site/layout';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { new_event_path, publish_event_path } from '@/routes';
import type { EventStatus, EventsShow } from '@/types';

const STEPS = [
  { number: 1, title: 'Enviar evento', description: 'Recibimos tu evento.' },
  { number: 2, title: 'Revisión y aprobación', description: 'El equipo revisa los datos.' },
  { number: 3, title: 'Editar Luma y publicar', description: 'Creamos tu evento en Luma; tú lo terminas.' },
  { number: 4, title: 'Evento publicado', description: 'En el programa de Chile Tech Week.' },
];

const STATUS_COPY: Record<number, string> = {
  1: 'Estamos revisando tu evento. Cuando lo aprobemos, crearemos tu evento en Luma y te invitaremos a editarlo.',
  2: 'Tu evento fue aprobado. Estamos preparando tu evento en Luma.',
  3: 'Tu evento en Luma está listo para editar. Revisa tu correo: ahí están las instrucciones. Cuando termines, publícalo aquí.',
  4: '¡Tu evento está publicado en Chile Tech Week! Los cambios que hagas en Luma (título, fecha, hora) se sincronizan solos.',
};

function stepState(step: number, current: number): 'done' | 'active' | 'pending' {
  if (step < current || current === 4) return 'done';
  if (step === current || (step === 2 && current === 1)) return 'active';
  return 'pending';
}

function Summary({ event }: { event: EventStatus }) {
  const rows: [string, React.ReactNode][] = [
    ['Organiza', `${event.companyName}${event.cohosts.length ? ` + ${event.cohosts.map((c) => c.companyName).join(' + ')}` : ''}`],
    ['Fecha', formatLongDay(event.startsAt)],
    ['Hora', `${formatTime(event.startsAt)} – ${formatTime(event.endsAt)}`],
    ['Comuna', event.commune],
    ['Formato', FORMAT_LABELS[event.format]],
    ['Capacidad', `${event.capacity} personas`],
    ['Temas', event.themes.map((t) => t.name).join(', ')],
    ['Audiencias', event.audiences.map((a) => a.name).join(', ')],
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
  const [step, setStep] = useState<1 | 2>(1);
  const [publishing, setPublishing] = useState(false);

  const close = (value: boolean) => {
    if (!value) setStep(1);
    onOpenChange(value);
  };

  const publish = () => {
    setPublishing(true);
    router.post(publish_event_path(event.id), {}, { onFinish: () => setPublishing(false), onSuccess: () => close(false) });
  };

  const checklist = [
    'Verificar la fecha y la hora del evento',
    'Agregar imágenes del evento',
    'Confirmar la dirección del lugar',
    'Completar la descripción (y borrar el texto autogenerado)',
    'Editar tu perfil de Luma con el nombre y el logo de la empresa',
  ];

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="site min-h-0 max-w-lg border-border bg-card text-card-foreground">
        {step === 1 ? (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-lg font-extrabold uppercase tracking-[-0.02em]">Antes de publicar</DialogTitle>
              <DialogDescription>Confirma que ya hiciste esto en tu evento de Luma:</DialogDescription>
            </DialogHeader>
            <ul className="flex flex-col gap-3 py-2">
              {checklist.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm">
                  <span className="mt-0.5 size-4 shrink-0 rounded-sm border border-input" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => close(false)}>
                Cancelar
              </Button>
              <Button type="button" onClick={() => setStep(2)}>
                Siguiente
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-lg font-extrabold uppercase tracking-[-0.02em]">Listo para publicar</DialogTitle>
              <DialogDescription>Revisa los datos antes de publicar.</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-2">
              <p className="font-display text-base font-extrabold uppercase tracking-[-0.02em]">{event.title}</p>
              <Summary event={event} />
              {event.lumaEventUrl && (
                <a href={event.lumaEventUrl} target="_blank" rel="noopener noreferrer" className="label text-primary hover:underline">
                  Ver en Luma
                </a>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setStep(1)} disabled={publishing}>
                Atrás
              </Button>
              <Button type="button" onClick={publish} disabled={publishing}>
                {publishing ? 'Publicando…' : 'Publicar evento'}
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
            <p className="text-sm text-muted-foreground">Guarda esta página: aquí verás el avance de tu evento. También te escribiremos a tu email.</p>
          )}
        </div>
      )}
      {flash.alert && (
        <div className="rounded-sm border border-primary px-5 py-4 text-sm" role="alert">
          {flash.alert}
        </div>
      )}

      <header className="flex flex-col gap-4">
        <div className="label text-primary">Tu evento · Chile Tech Week 2026</div>
        <h1 className="font-display text-[clamp(26px,3.6vw,44px)] font-extrabold uppercase leading-[.95] tracking-[-0.03em]">
          {event.title}
        </h1>
      </header>

      {deleted ? (
        <section className="flex flex-col items-start gap-4 border-t border-border pt-8">
          <h2 className="font-display text-lg font-extrabold uppercase tracking-[-0.02em]">Este evento fue dado de baja</h2>
          <p className="max-w-[48ch] text-sm text-muted-foreground">
            El evento ya no está activo. Si fue un error, escríbenos; si quieres, envía uno nuevo.
          </p>
          <Button asChild>
            <Link href={new_event_path()}>Enviar un evento nuevo</Link>
          </Button>
        </section>
      ) : rejected ? (
        <section className="flex flex-col items-start gap-4 border-t border-border pt-8">
          <h2 className="font-display text-lg font-extrabold uppercase tracking-[-0.02em]">Tu evento necesita cambios</h2>
          {event.rejectionReason && <p className="max-w-[56ch] whitespace-pre-wrap text-sm">{event.rejectionReason}</p>}
          <p className="max-w-[48ch] text-sm text-muted-foreground">Corrige lo indicado y vuelve a enviarlo.</p>
          <Button asChild>
            <Link href={new_event_path()}>Enviar de nuevo</Link>
          </Button>
        </section>
      ) : (
        <>
          <section className="flex flex-col gap-3 border-t border-border pt-8">
            <div className="label text-muted-foreground">Estado · paso {event.step} de 4</div>
            <p className="max-w-[56ch] text-base">{STATUS_COPY[event.step]}</p>
            {event.step === 3 && (
              <div className="mt-2 flex flex-wrap items-center gap-4">
                <Button type="button" onClick={() => setPublishOpen(true)}>
                  Ya edité Luma · Publicar evento
                </Button>
                {event.lumaEventUrl && (
                  <a href={event.lumaEventUrl} target="_blank" rel="noopener noreferrer" className="label inline-flex items-center gap-1 text-primary hover:underline">
                    Editar en Luma <ArrowUpRight className="size-3" />
                  </a>
                )}
              </div>
            )}
            {event.step === 4 && event.registrationUrl && (
              <a href={event.registrationUrl} target="_blank" rel="noopener noreferrer" className="label inline-flex items-center gap-1 self-start text-primary hover:underline">
                Ver evento <ArrowUpRight className="size-3" />
              </a>
            )}
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="label text-muted-foreground">Proceso</h2>
            <ol className="flex flex-col">
              {STEPS.map((step) => {
                const state = stepState(step.number, event.step);
                return (
                  <li key={step.number} className={cn('flex items-start gap-4 border-b border-border py-4 first:border-t', state === 'pending' && 'text-muted-foreground')}>
                    <span className={cn('mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border', state === 'done' ? 'border-primary bg-primary text-white' : state === 'active' ? 'border-primary text-primary' : 'border-border')}>
                      {state === 'done' ? <Check className="size-3.5" /> : state === 'active' ? <Hourglass className="size-3" /> : <Circle className="size-2" />}
                    </span>
                    <div className="flex flex-1 flex-col gap-0.5">
                      <span className="font-display text-sm font-extrabold uppercase tracking-[-0.02em]">
                        {step.number}. {step.title}
                      </span>
                      <span className="text-xs">{step.description}</span>
                    </div>
                    <span className="label text-[10px]">
                      {state === 'done' ? 'Completado' : state === 'active' ? 'En curso' : 'Pendiente'}
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
          <h2 className="label text-muted-foreground">Imagen del evento</h2>
          <img
            src={event.coverImageUrl}
            alt={`Portada de ${event.title}`}
            className="w-full rounded-sm border border-border object-cover"
          />
          <p className="text-xs text-muted-foreground">
            Es la portada de tu evento en Luma. Si la cambias allá, se actualiza acá.
          </p>
        </section>
      )}

      <section className="flex flex-col gap-4">
        <h2 className="label text-muted-foreground">Resumen</h2>
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
