import { Head, Link, router } from '@inertiajs/react';
import { Check, ChevronLeft, ExternalLink, Pencil, Plus, Trash2, X } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Field, Flash, formatDateTime, LogoOnBlack, StateBadge } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  admin_event_approval_path,
  admin_event_cohost_path,
  admin_event_cohosts_path,
  admin_event_path,
  admin_event_rejection_path,
  admin_events_path,
} from '@/routes';
import type { AdminCohost, AdminEventsShow, EventFormat } from '@/types';

const FORMAT_LABELS: Record<EventFormat, string> = {
  breakfast_brunch_lunch: 'Desayuno / Brunch / Almuerzo',
  dinner: 'Cena',
  experiential: 'Experiencial',
  hackathon: 'Hackathon',
  happy_hour: 'Happy hour',
  matchmaking: 'Matchmaking',
  networking: 'Networking',
  panel_fireside_chat: 'Panel / Fireside chat',
  pitch_event_demo_day: 'Pitch / Demo day',
  roundtable_workshop: 'Mesa redonda / Taller',
};

const CARD = 'gap-4 rounded-sm border-border py-5 shadow-none';
const TITLE = 'label text-[10px] text-muted-foreground';

// /admin/events/:id — everything about one submission, and every change the admin can make.
export default function Show({ event, communes }: AdminEventsShow) {
  const [busy, setBusy] = useState(false);
  const patch = (data: Record<string, string | boolean | File>) =>
    router.patch(admin_event_path(event.id), { event: data }, { preserveScroll: true, forceFormData: true, onStart: () => setBusy(true), onFinish: () => setBusy(false) });

  return (
    <div className="mx-auto max-w-4xl">
      <Head>
        <title>{`${event.title} · Admin`}</title>
      </Head>
      <Link href={admin_events_path()} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Volver a eventos
      </Link>
      <Flash />

      <div className="mb-6 flex flex-wrap items-start justify-between gap-6">
        <div className="flex items-start gap-5">
          <LogoOnBlack url={event.companyLogoUrl} alt={event.companyName} className="size-20 shrink-0" />
          <div>
            <h1 className="font-display text-xl font-extrabold uppercase tracking-[-0.03em]">{event.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {event.companyName} · Edición {event.edition}
            </p>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">ID {event.id}</p>
            <p className="font-mono text-[11px] text-muted-foreground">Public ID {event.publicId}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-3">
          <StateBadge state={event.state} />
          <div className="flex flex-wrap gap-2">
            <CommuneDialog current={event.commune} communes={communes} onSave={(commune) => patch({ commune })} />
            {event.state === 'submitted' && <Moderation eventId={event.id} />}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <Card className={CARD}>
          <CardHeader>
            <CardTitle className={TITLE}>Evento</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field label="Inicio"><span className="font-mono">{formatDateTime(event.startsAt)}</span></Field>
            <Field label="Término"><span className="font-mono">{formatDateTime(event.endsAt)}</span></Field>
            <Field label="Formato">{FORMAT_LABELS[event.format]}</Field>
            <Field label="Comuna">{event.commune}</Field>
            <Field label="Capacidad">{event.capacity} personas</Field>
            <Field label="Edición">{event.edition}</Field>
            <Field label="Descripción" className="md:col-span-2"><p className="whitespace-pre-wrap">{event.description}</p></Field>
            {event.latitude && event.longitude && (
              <Field label="Coordenadas"><span className="font-mono">{event.latitude}, {event.longitude}</span></Field>
            )}
          </CardContent>
        </Card>

        <Card className={CARD}>
          <CardHeader>
            <CardTitle className={TITLE}>Organizador</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field label="Nombre">{event.authorName}</Field>
            <Field label="Empresa">{event.companyName}</Field>
            <Field label="Email"><a href={`mailto:${event.authorEmail}`} className="underline-offset-2 hover:underline">{event.authorEmail}</a></Field>
            <Field label="Teléfono"><a href={`tel:${event.authorPhoneNumber}`} className="font-mono underline-offset-2 hover:underline">{event.authorPhoneNumber}</a></Field>
            <Field label="Sitio web" className="md:col-span-2">
              <a href={event.companyWebsite} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline-offset-2 hover:underline">
                {event.companyWebsite} <ExternalLink className="size-3" />
              </a>
            </Field>
          </CardContent>
        </Card>

        <Card className={CARD}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className={TITLE}>Logo de la empresa</CardTitle>
            <div className="flex items-center gap-4">
              {event.state === 'published' && (
                <label className="flex items-center gap-2 text-xs">
                  <Switch checked={!!event.logoShownAt} disabled={busy} onCheckedChange={(checked) => patch({ logo_shown: checked })} aria-label="Logo visible en la landing" />
                  Visible en la landing
                </label>
              )}
              <LogoUpload label="Cambiar logo" onFile={(file) => patch({ logo_upload: file })} disabled={busy} />
            </div>
          </CardHeader>
          <CardContent>
            <LogoOnBlack url={event.companyLogoUrl} alt={event.companyName} className="h-24 w-48" />
            <p className="mt-2 text-xs text-muted-foreground">Se muestra sobre negro, como en el sitio.</p>
          </CardContent>
        </Card>

        {event.coverImageUrl && (
          <Card className={CARD}>
            <CardHeader>
              <CardTitle className={TITLE}>Portada en Luma</CardTitle>
            </CardHeader>
            <CardContent>
              <img
                src={event.coverImageUrl}
                alt={`Portada de ${event.title}`}
                className="max-h-64 rounded-sm border border-border object-cover"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                La pone el organizador en Luma y se sincroniza sola.{' '}
                {event.coverMirrored ? 'Guardada en el sitio.' : 'Servida desde Luma; aún sin copia propia.'}
              </p>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <Card className={CARD}>
            <CardHeader>
              <CardTitle className={TITLE}>Temas</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {event.themes.length === 0 && <span className="text-sm text-muted-foreground">—</span>}
              {event.themes.map((theme) => (
                <span key={theme.id} className="rounded-sm border border-border px-2 py-1 font-mono text-[11px]">{theme.name}</span>
              ))}
            </CardContent>
          </Card>
          <Card className={CARD}>
            <CardHeader>
              <CardTitle className={TITLE}>Audiencias</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {event.audiences.length === 0 && <span className="text-sm text-muted-foreground">—</span>}
              {event.audiences.map((audience) => (
                <span key={audience.id} className="rounded-sm border border-border px-2 py-1 font-mono text-[11px]">{audience.name}</span>
              ))}
            </CardContent>
          </Card>
        </div>

        <Cohosts eventId={event.id} cohosts={event.cohosts} published={event.state === 'published'} />

        <Card className={CARD}>
          <CardHeader>
            <CardTitle className={TITLE}>URLs</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <CustomUrl current={event.customUrl} onSave={(customUrl) => patch({ custom_url: customUrl })} busy={busy} />
            {event.lumaEventApiId && <Field label="Luma API ID"><span className="font-mono">{event.lumaEventApiId}</span></Field>}
            {event.lumaEventUrl && (
              <Field label="Evento en Luma">
                <a href={event.lumaEventUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-mono underline-offset-2 hover:underline">
                  {event.lumaEventUrl} <ExternalLink className="size-3" />
                </a>
              </Field>
            )}
            {event.lumaEventCreatedAt && <Field label="Evento en Luma creado"><span className="font-mono">{formatDateTime(event.lumaEventCreatedAt)}</span></Field>}
          </CardContent>
        </Card>

        <Card className={CARD}>
          <CardHeader>
            <CardTitle className={TITLE}>Estado y fechas</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field label="Estado"><StateBadge state={event.state} /></Field>
            <Field label="Creado"><span className="font-mono">{formatDateTime(event.createdAt)}</span></Field>
            <Field label="Enviado"><span className="font-mono">{formatDateTime(event.submittedAt)}</span></Field>
            <Field label="Actualizado"><span className="font-mono">{formatDateTime(event.updatedAt)}</span></Field>
            {event.approvedAt && <Field label="Aprobado"><span className="font-mono">{formatDateTime(event.approvedAt)}</span></Field>}
            {event.rejectedAt && <Field label="Rechazado"><span className="font-mono">{formatDateTime(event.rejectedAt)}</span></Field>}
            {event.waitingLumaEditAt && <Field label="Esperando edición en Luma desde"><span className="font-mono">{formatDateTime(event.waitingLumaEditAt)}</span></Field>}
            {event.publishedAt && <Field label="Publicado"><span className="font-mono">{formatDateTime(event.publishedAt)}</span></Field>}
            {event.deletedAt && <Field label="Dado de baja"><span className="font-mono">{formatDateTime(event.deletedAt)}</span></Field>}
            {event.rejectionReason && <Field label="Motivo del rechazo" className="md:col-span-2"><p className="text-primary">{event.rejectionReason}</p></Field>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Aprobar / Rechazar (with the reason the host will read), for submitted events only.
function Moderation({ eventId }: { eventId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState<'approve' | 'reject' | null>(null);

  const approve = () =>
    router.post(admin_event_approval_path(eventId), {}, { onStart: () => setPending('approve'), onFinish: () => setPending(null) });
  const reject = (e: FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    router.post(
      admin_event_rejection_path(eventId),
      { reason: reason.trim() },
      { onStart: () => setPending('reject'), onFinish: () => setPending(null), onSuccess: () => setOpen(false) },
    );
  };

  return (
    <>
      <Button size="sm" onClick={approve} disabled={pending !== null} className="bg-emerald-600 text-white hover:bg-emerald-700">
        <Check /> {pending === 'approve' ? 'Aprobando…' : 'Aprobar'}
      </Button>
      <Button size="sm" variant="destructive" onClick={() => setOpen(true)} disabled={pending !== null}>
        <X /> Rechazar
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-sm">
          <form onSubmit={reject} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Rechazar evento</DialogTitle>
              <DialogDescription>El organizador recibirá este motivo por correo.</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              <Label htmlFor="reason">Motivo del rechazo</Label>
              <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej.: el evento no calza con los lineamientos de la semana…" className="min-h-28" required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending === 'reject'}>Cancelar</Button>
              <Button type="submit" variant="destructive" disabled={pending === 'reject' || !reason.trim()}>
                {pending === 'reject' ? 'Rechazando…' : 'Rechazar evento'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CommuneDialog({ current, communes, onSave }: { current: string; communes: string[]; onSave: (commune: string) => void }) {
  const [open, setOpen] = useState(false);
  const [commune, setCommune] = useState(current);

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => { setCommune(current); setOpen(true); }}>
        <Pencil /> Editar comuna
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-sm">
          <DialogHeader>
            <DialogTitle>Editar comuna</DialogTitle>
            <DialogDescription>Actual: {current}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label>Comuna</Label>
            <Select value={commune} onValueChange={setCommune}>
              <SelectTrigger className="w-full" aria-label="Comuna"><SelectValue /></SelectTrigger>
              <SelectContent>
                {communes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button disabled={commune === current} onClick={() => { onSave(commune); setOpen(false); }}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CustomUrl({ current, onSave, busy }: { current: string | null; onSave: (url: string) => void; busy: boolean }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(current ?? '');

  if (!editing) {
    return (
      <Field label="URL propia (reemplaza a la de Luma en el programa)">
        <div className="flex flex-wrap items-center gap-3">
          {current ? (
            <a href={current} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-mono underline-offset-2 hover:underline">
              {current} <ExternalLink className="size-3" />
            </a>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
          <Button size="xs" variant="outline" onClick={() => { setValue(current ?? ''); setEditing(true); }}>{current ? 'Editar' : 'Agregar URL'}</Button>
          {current && <Button size="xs" variant="outline" disabled={busy} onClick={() => onSave('')}><X /> Limpiar</Button>}
        </div>
      </Field>
    );
  }

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => { e.preventDefault(); onSave(value.trim()); setEditing(false); }}
    >
      <Label htmlFor="custom_url">URL propia</Label>
      <div className="flex gap-2">
        <Input id="custom_url" type="url" value={value} onChange={(e) => setValue(e.target.value)} placeholder="https://empresa.cl/evento" />
        <Button type="submit" size="sm" disabled={busy || value.trim() === (current ?? '')}>Guardar</Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
      </div>
    </form>
  );
}

// A file picker that submits as soon as an image is chosen.
function LogoUpload({ label, onFile, disabled }: { label: string; onFile: (file: File) => void; disabled?: boolean }) {
  return (
    <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-sm border border-border px-3 text-xs font-medium hover:bg-accent has-disabled:opacity-50">
      <Pencil className="size-3" /> {label}
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = '';
        }}
      />
    </label>
  );
}

const COHOST_FIELDS: Array<{ name: string; label: string; type?: string; required?: boolean }> = [
  { name: 'company_name', label: 'Empresa', required: true },
  { name: 'primary_contact_name', label: 'Nombre de contacto', required: true },
  { name: 'primary_contact_email', label: 'Email de contacto', type: 'email', required: true },
  { name: 'primary_contact_phone_number', label: 'Teléfono', type: 'tel' },
  { name: 'primary_contact_website', label: 'Sitio web', type: 'url' },
  { name: 'primary_contact_linkedin', label: 'LinkedIn', type: 'url' },
];

function Cohosts({ eventId, cohosts, published }: { eventId: string; cohosts: AdminCohost[]; published: boolean }) {
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<AdminCohost | null>(null);
  const [busy, setBusy] = useState(false);

  const add = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const cohost: Record<string, FormDataEntryValue> = {};
    form.forEach((value, key) => { cohost[key] = value; });
    router.post(admin_event_cohosts_path(eventId), { cohost }, {
      forceFormData: true, preserveScroll: true,
      onStart: () => setBusy(true), onFinish: () => setBusy(false), onSuccess: () => setAdding(false),
    });
  };
  const patch = (cohost: AdminCohost, data: Record<string, string | boolean | File>) =>
    router.patch(admin_event_cohost_path(eventId, cohost.id), { cohost: data }, { forceFormData: true, preserveScroll: true, onStart: () => setBusy(true), onFinish: () => setBusy(false) });
  const remove = () => {
    if (!removing) return;
    router.delete(admin_event_cohost_path(eventId, removing.id), { preserveScroll: true, onStart: () => setBusy(true), onFinish: () => setBusy(false), onSuccess: () => setRemoving(null) });
  };

  return (
    <Card className={CARD}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className={TITLE}>Co-hosts</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setAdding(true)}><Plus /> Agregar co-host</Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {cohosts.length === 0 && <p className="text-sm text-muted-foreground">Este evento no tiene co-hosts.</p>}
        {cohosts.map((cohost) => (
          <div key={cohost.id} className="flex flex-wrap items-start gap-4 rounded-sm border border-border p-4">
            <LogoOnBlack url={cohost.companyLogoUrl} alt={cohost.companyName} className="h-16 w-28 shrink-0" />
            <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
              <Field label="Empresa">{cohost.companyName}</Field>
              <Field label="Contacto">{cohost.primaryContactName}</Field>
              <Field label="Email"><a href={`mailto:${cohost.primaryContactEmail}`} className="underline-offset-2 hover:underline">{cohost.primaryContactEmail}</a></Field>
              <Field label="Teléfono"><span className="font-mono">{cohost.primaryContactPhoneNumber ?? '—'}</span></Field>
              <Field label="Sitio web">{cohost.primaryContactWebsite ? <a href={cohost.primaryContactWebsite} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">{cohost.primaryContactWebsite}</a> : '—'}</Field>
              <Field label="LinkedIn">{cohost.primaryContactLinkedin ? <a href={cohost.primaryContactLinkedin} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">{cohost.primaryContactLinkedin}</a> : '—'}</Field>
            </div>
            <div className="flex w-full flex-wrap items-center justify-end gap-3 sm:w-auto sm:flex-col sm:items-end">
              {published && (
                <label className="flex items-center gap-2 text-xs">
                  <Switch checked={!!cohost.logoShownAt} disabled={busy} onCheckedChange={(checked) => patch(cohost, { logo_shown: checked })} aria-label={`Logo de ${cohost.companyName} visible en la landing`} />
                  Logo visible
                </label>
              )}
              <LogoUpload label="Cambiar logo" onFile={(file) => patch(cohost, { logo_upload: file })} disabled={busy} />
              <Button size="xs" variant="outline" className="text-primary" onClick={() => setRemoving(cohost)} disabled={busy}><Trash2 /> Eliminar</Button>
            </div>
          </div>
        ))}
      </CardContent>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="rounded-sm">
          <form onSubmit={add} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Agregar co-host</DialogTitle>
              <DialogDescription>La empresa aparece junto al organizador en el programa.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              {COHOST_FIELDS.map((field) => (
                <div key={field.name} className="flex flex-col gap-1.5">
                  <Label htmlFor={`cohost_${field.name}`}>{field.label}{field.required && ' *'}</Label>
                  <Input id={`cohost_${field.name}`} name={field.name} type={field.type ?? 'text'} required={field.required} />
                </div>
              ))}
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="cohost_logo_upload">Logo *</Label>
                <Input id="cohost_logo_upload" name="logo_upload" type="file" accept="image/png,image/jpeg,image/webp" required />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAdding(false)} disabled={busy}>Cancelar</Button>
              <Button type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Agregar'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={removing !== null} onOpenChange={(open) => !open && setRemoving(null)}>
        <DialogContent className="rounded-sm">
          <DialogHeader>
            <DialogTitle>Eliminar co-host</DialogTitle>
            <DialogDescription>¿Quitar a {removing?.companyName} de este evento? No se puede deshacer.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoving(null)} disabled={busy}>Cancelar</Button>
            <Button variant="destructive" onClick={remove} disabled={busy}>{busy ? 'Eliminando…' : 'Eliminar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
