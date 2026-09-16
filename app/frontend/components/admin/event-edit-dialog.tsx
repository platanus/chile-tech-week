import { Form } from '@inertiajs/react';
import { Pencil } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { useWeek } from '@/components/admin/ui';
import { TIME_ZONE } from '@/components/events/dates';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { admin_event_path } from '@/routes';
import type { AdminEvent, Audience, EventFormat, Theme } from '@/types';

// Every field the organiser submitted, in one dialog. The title and dates are the
// host's to change on Luma once their Luma event exists (Event::LUMA_SYNCED_ATTRIBUTES):
// the form shows them locked, and the server refuses them anyway.

const LUMA_NOTE = 'Se edita en Luma; el sitio lo sincroniza desde allá.';

// ISO → the "YYYY-MM-DDTHH:MM" a datetime-local speaks, in Santiago time (which is how
// the server reads it back).
const localParts = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});
function toDateTimeLocal(iso: string): string {
  const part = Object.fromEntries(localParts.formatToParts(new Date(iso)).map((p) => [p.type, p.value]));
  return `${part.year}-${part.month}-${part.day}T${part.hour}:${part.minute}`;
}

export function EventEditDialog({ event, communes, formats, formatLabels, themes, audiences }: {
  event: AdminEvent;
  communes: string[];
  formats: EventFormat[];
  formatLabels: Record<EventFormat, string>;
  themes: Theme[];
  audiences: Audience[];
}) {
  const week = useWeek();
  const [open, setOpen] = useState(false);
  const locked = event.lumaSynced;

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Pencil /> Editar evento
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-sm sm:max-w-2xl">
          <Form
            action={admin_event_path(week.slug, event.id)}
            method="patch"
            options={{ preserveScroll: true }}
            onSuccess={() => setOpen(false)}
            className="flex flex-col gap-6"
          >
            {({ errors, processing }) => (
              <>
                <DialogHeader>
                  <DialogTitle>Editar evento</DialogTitle>
                  <DialogDescription>
                    {locked ? 'Todo menos el título y las fechas, que viven en Luma.' : 'Todo lo que el organizador envió.'}
                  </DialogDescription>
                </DialogHeader>

                <Section title="Evento">
                  <FormField label="Título" htmlFor="edit_title" error={errors.title} hint={locked ? LUMA_NOTE : undefined} className="sm:col-span-2">
                    <Input id="edit_title" name="event[title]" defaultValue={event.title} disabled={locked} required />
                  </FormField>
                  <FormField label="Descripción" htmlFor="edit_description" error={errors.description} className="sm:col-span-2">
                    <Textarea id="edit_description" name="event[description]" defaultValue={event.description} className="min-h-28" required />
                  </FormField>
                  <FormField label="Inicio" htmlFor="edit_starts_at" error={errors.starts_at} hint={locked ? LUMA_NOTE : undefined}>
                    <Input id="edit_starts_at" name="event[starts_at]" type="datetime-local" defaultValue={toDateTimeLocal(event.startsAt)} disabled={locked} required className="scheme-dark" />
                  </FormField>
                  <FormField label="Término" htmlFor="edit_ends_at" error={errors.ends_at} hint={locked ? LUMA_NOTE : undefined}>
                    <Input id="edit_ends_at" name="event[ends_at]" type="datetime-local" defaultValue={toDateTimeLocal(event.endsAt)} disabled={locked} required className="scheme-dark" />
                  </FormField>
                  <FormField label="Comuna" htmlFor="edit_commune" error={errors.commune}>
                    <Select name="event[commune]" defaultValue={event.commune}>
                      <SelectTrigger id="edit_commune" className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {communes.map((commune) => <SelectItem key={commune} value={commune}>{commune}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormField>
                  <FormField label="Formato" htmlFor="edit_format" error={errors.format}>
                    <Select name="event[format]" defaultValue={event.format}>
                      <SelectTrigger id="edit_format" className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {formats.map((format) => <SelectItem key={format} value={format}>{formatLabels[format]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormField>
                  <FormField label="Capacidad" htmlFor="edit_capacity" error={errors.capacity}>
                    <Input id="edit_capacity" name="event[capacity]" type="number" min={1} step={1} defaultValue={event.capacity} required />
                  </FormField>
                </Section>

                <Section title="Organizador">
                  <FormField label="Nombre" htmlFor="edit_author_name" error={errors.author_name}>
                    <Input id="edit_author_name" name="event[author_name]" defaultValue={event.authorName} required />
                  </FormField>
                  <FormField label="Empresa" htmlFor="edit_company_name" error={errors.company_name}>
                    <Input id="edit_company_name" name="event[company_name]" defaultValue={event.companyName} required />
                  </FormField>
                  <FormField label="Email" htmlFor="edit_author_email" error={errors.author_email}>
                    <Input id="edit_author_email" name="event[author_email]" type="email" defaultValue={event.authorEmail} required />
                  </FormField>
                  <FormField label="Teléfono" htmlFor="edit_author_phone_number" error={errors.author_phone_number}>
                    <Input id="edit_author_phone_number" name="event[author_phone_number]" type="tel" defaultValue={event.authorPhoneNumber} required />
                  </FormField>
                  <FormField label="Sitio web" htmlFor="edit_company_website" error={errors.company_website} className="sm:col-span-2">
                    <Input id="edit_company_website" name="event[company_website]" type="url" defaultValue={event.companyWebsite} required />
                  </FormField>
                </Section>

                <Section title="Temas" error={errors.themes}>
                  <CatalogueGrid name="event[theme_ids][]" options={themes} selected={event.themes.map((t) => t.id)} />
                </Section>
                <Section title="Audiencias" error={errors.audiences}>
                  <CatalogueGrid name="event[audience_ids][]" options={audiences} selected={event.audiences.map((a) => a.id)} />
                </Section>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={processing}>Cancelar</Button>
                  <Button type="submit" disabled={processing}>{processing ? 'Guardando…' : 'Guardar'}</Button>
                </DialogFooter>
              </>
            )}
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Section({ title, error, children }: { title: string; error?: string | string[]; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="label mb-3 text-[10px] text-muted-foreground">{title}</legend>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
      <FieldError error={error} />
    </fieldset>
  );
}

function FormField({ label, htmlFor, error, hint, className, children }: {
  label: string;
  htmlFor: string;
  error?: string | string[];
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className ? `flex flex-col gap-1.5 ${className}` : 'flex flex-col gap-1.5'}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <FieldError error={error} />
    </div>
  );
}

function FieldError({ error }: { error?: string | string[] }) {
  if (!error) return null;
  return <p className="text-xs text-primary">{Array.isArray(error) ? error.join('. ') : error}</p>;
}

// The whole catalogue as checkboxes. The empty hidden value travels even when nothing is
// ticked, so the server receives an empty list (clear them) rather than no list (keep them).
function CatalogueGrid({ name, options, selected }: { name: string; options: { id: string; name: string }[]; selected: string[] }) {
  return (
    <div className="grid gap-x-6 gap-y-2 sm:col-span-2 sm:grid-cols-2 md:grid-cols-3">
      <input type="hidden" name={name} value="" />
      {options.length === 0 && <span className="text-sm text-muted-foreground">—</span>}
      {options.map((option) => (
        <label key={option.id} className="flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox name={name} value={option.id} defaultChecked={selected.includes(option.id)} />
          {option.name}
        </label>
      ))}
    </div>
  );
}
