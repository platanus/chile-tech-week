import { Head, Link, router } from '@inertiajs/react';
import { Mail, Search, X } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { buildQuery, EmailStatusBadge, Flash, formatDateTime, PageTitle, Pager, useWeek } from '@/components/admin/ui';
import { Input } from '@/components/ui/input';
import { admin_outbound_email_path, admin_outbound_emails_path } from '@/routes';
import type { AdminOutboundEmailsIndex } from '@/types';

// /admin/26/emails — every message this week's events sent, with the totals.
export default function Index({ emails, pagination, search, stats }: AdminOutboundEmailsIndex) {
  const week = useWeek();
  const [query, setQuery] = useState(search);
  const go = (params: { search?: string; page?: number }) =>
    router.get(admin_outbound_emails_path(week.slug) + buildQuery({ search, ...params }), {}, { preserveState: true });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    go({ search: query.trim(), page: undefined });
  };

  const tiles = [
    ['Total', stats.total],
    ['Enviados', stats.sent],
    ['Fallidos', stats.failed],
    ['Tasa de éxito', stats.total > 0 ? `${stats.successRate}%` : '—'],
  ] as const;

  return (
    <>
      <Head>
        <title>Correos · Admin</title>
      </Head>
      <Flash />
      <PageTitle title="Correos" subtitle="Lo que el sitio envió por los eventos de esta edición." action={<div className="font-mono text-xs text-muted-foreground">Total: {pagination.count} correos</div>} />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map(([label, value]) => (
          <div key={label} className="rounded-sm border border-border p-4">
            <div className="label text-[10px] text-muted-foreground">{label}</div>
            <div className="mt-1 font-mono text-2xl">{value}</div>
          </div>
        ))}
      </div>

      <form onSubmit={submit} className="relative mb-6 md:max-w-md">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input type="search" placeholder="Buscar por destinatario, asunto o plantilla…" aria-label="Buscar correos" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
        {search && (
          <button type="button" aria-label="Limpiar búsqueda" onClick={() => { setQuery(''); go({ search: '', page: undefined }); }} className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        )}
      </form>

      {emails.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-sm border border-dashed border-border py-16 text-center">
          <Mail className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{search ? `Ningún correo coincide con “${search}”.` : 'Todavía no se ha enviado ningún correo.'}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {emails.map((email) => (
            <li key={email.id}>
              <Link href={admin_outbound_email_path(week.slug, email.id)} className="block rounded-sm border border-border bg-card p-4 transition-colors hover:border-foreground">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-mono text-[11px] text-muted-foreground">{email.templateName}</div>
                    <div className="mt-0.5 line-clamp-1 font-semibold">{email.subject}</div>
                  </div>
                  <EmailStatusBadge status={email.status} />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Mail className="size-3.5" />{email.to}</span>
                  <span className="font-mono">{formatDateTime(email.sentAt ?? email.createdAt)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Pager pagination={pagination} buildHref={(page) => admin_outbound_emails_path(week.slug) + buildQuery({ search, page })} />
    </>
  );
}
