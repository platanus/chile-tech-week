import { Link, router, usePage } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AdminPagination, AdminWeek, EventState } from '@/types';

// The pieces every admin page shares: the flash bar, the page title, the state badges, the
// dates (always Santiago time) and the pager.

// The Tech Week the panel is on — every admin route carries its slug (/admin/26/events), so
// every path helper on these pages takes it. Admin::BaseController shares it.
export function useWeek(): AdminWeek {
  const week = usePage().props.week;
  if (!week) throw new Error('No week in the props: is this page rendered by Admin::BaseController?');
  return week;
}

export function Flash() {
  const { flash } = usePage().props;
  const [dismissed, setDismissed] = useState<string | null>(null);
  const message = flash.alert ?? flash.notice;
  useEffect(() => setDismissed(null), [flash.alert, flash.notice]);
  if (!message || dismissed === message) return null;

  return (
    <div
      role="status"
      className={cn(
        'mb-6 flex items-start justify-between gap-4 rounded-sm border px-4 py-3 text-sm',
        flash.alert ? 'border-primary bg-primary/5 text-foreground' : 'border-border bg-secondary',
      )}
    >
      <span>{message}</span>
      <button type="button" aria-label="Cerrar" onClick={() => setDismissed(message)} className="text-muted-foreground hover:text-foreground">
        <X className="size-4" />
      </button>
    </div>
  );
}

export function PageTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-extrabold uppercase tracking-[-0.03em]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export const STATE_LABELS: Record<EventState, string> = {
  submitted: 'Enviado',
  rejected: 'Rechazado',
  waiting_luma_edit: 'Esperando edición en Luma',
  published: 'Publicado',
  deleted: 'Dado de baja',
};

const STATE_STYLES: Record<EventState, string> = {
  submitted: 'border-border bg-white text-foreground',
  rejected: 'border-foreground bg-foreground text-white',
  waiting_luma_edit: 'border-amber-400 bg-amber-100 text-amber-900',
  published: 'border-primary bg-primary text-white',
  deleted: 'border-red-200 bg-red-50 text-red-700',
};

export function StateBadge({ state }: { state: EventState }) {
  return (
    <Badge variant="outline" className={cn('rounded-sm font-mono text-[11px] uppercase tracking-wider', STATE_STYLES[state])}>
      {STATE_LABELS[state]}
    </Badge>
  );
}

const EMAIL_STATUS: Record<string, [string, string]> = {
  sent: ['Enviado', 'border-primary bg-primary text-white'],
  failed: ['Fallido', 'border-red-200 bg-red-50 text-red-700'],
  pending: ['Pendiente', 'border-amber-400 bg-amber-100 text-amber-900'],
  queued: ['En cola', 'border-border bg-white text-foreground'],
};

export function EmailStatusBadge({ status }: { status: string }) {
  const [label, style] = EMAIL_STATUS[status] ?? [status, 'border-border bg-white'];
  return (
    <Badge variant="outline" className={cn('rounded-sm font-mono text-[11px] uppercase tracking-wider', style)}>
      {label}
    </Badge>
  );
}

const TIME_ZONE = 'America/Santiago';
const dateTime = new Intl.DateTimeFormat('es-CL', {
  timeZone: TIME_ZONE,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});
const dateTimeSeconds = new Intl.DateTimeFormat('es-CL', {
  timeZone: TIME_ZONE,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

/** "18 nov 2026 18:00", or "—" when null. */
export function formatDateTime(iso: string | null | undefined, seconds = false): string {
  if (!iso) return '—';
  return (seconds ? dateTimeSeconds : dateTime).format(new Date(iso)).replace(',', '');
}

// A label + value pair, the admin's way of showing a field.
export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <div className="label text-[10px] text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm break-words">{children}</div>
    </div>
  );
}

// A dark tile: how the logos look on the black site.
export function LogoOnBlack({ url, alt, className }: { url: string | null; alt: string; className?: string }) {
  return (
    <div className={cn('flex items-center justify-center rounded-sm border border-border bg-black p-3', className)}>
      {url ? <img src={url} alt={alt} className="max-h-full max-w-full object-contain" /> : <span className="font-mono text-xs text-muted-foreground">sin logo</span>}
    </div>
  );
}

export function Pager({ pagination, buildHref }: { pagination: AdminPagination; buildHref: (page: number) => string }) {
  if (pagination.last <= 1) return null;
  const start = Math.max(1, Math.min(pagination.page - 2, pagination.last - 4));
  const pages = Array.from({ length: Math.min(5, pagination.last) }, (_, i) => start + i);

  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
      <div className="font-mono text-xs text-muted-foreground">
        Página {pagination.page} de {pagination.last} · {pagination.from}–{pagination.to} de {pagination.count}
      </div>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" disabled={!pagination.previous} onClick={() => pagination.previous && router.get(buildHref(pagination.previous), {}, { preserveState: true })}>
          <ChevronLeft /> Anterior
        </Button>
        {pages.map((page) => (
          <Link
            key={page}
            href={buildHref(page)}
            preserveState
            className={cn(
              'inline-flex h-8 min-w-8 items-center justify-center rounded-sm border px-2 font-mono text-xs',
              page === pagination.page ? 'border-foreground bg-foreground text-white' : 'border-border hover:bg-accent',
            )}
          >
            {page}
          </Link>
        ))}
        <Button variant="outline" size="sm" disabled={!pagination.next} onClick={() => pagination.next && router.get(buildHref(pagination.next), {}, { preserveState: true })}>
          Siguiente <ChevronRight />
        </Button>
      </div>
    </div>
  );
}

export function buildQuery(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}
