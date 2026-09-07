import { Head, Link, router } from '@inertiajs/react';
import { Building2, CalendarDays, Clock, Search, X } from 'lucide-react';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { buildQuery, Flash, formatDateTime, PageTitle, Pager, STATE_LABELS, StateBadge, useWeek } from '@/components/admin/ui';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { admin_event_path, admin_events_path } from '@/routes';
import type { AdminEventsIndex, EventState } from '@/types';

const STATES = Object.keys(STATE_LABELS) as EventState[];

// The week’s events, optionally filtered by state, searched and paged.
export default function Index({ events, pagination, status, search }: AdminEventsIndex) {
  const week = useWeek();
  const [query, setQuery] = useState(search);

  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const cancelSearch = useRef<(() => void) | undefined>(undefined);

  useEffect(() => {
    // A pending search must never pull you back after changing page, week or section.
    const removeBefore = router.on('before', () => clearTimeout(timer.current));
    const removeNavigate = router.on('navigate', ({ detail }) => {
      clearTimeout(timer.current);
      setQuery(String(detail.page.props.search ?? ''));
    });
    return () => {
      clearTimeout(timer.current);
      cancelSearch.current?.();
      removeBefore();
      removeNavigate();
    };
  }, []);

  const go = (params: { status?: string; search?: string; page?: number }, replace = false) => {
    clearTimeout(timer.current);
    cancelSearch.current?.();
    router.get(admin_events_path(week.slug) + buildQuery({ status, search, ...params }), {}, {
      preserveState: true,
      preserveScroll: true,
      replace,
      onCancelToken: (token) => { cancelSearch.current = token.cancel; },
      onFinish: () => { cancelSearch.current = undefined; },
    });
  };

  const changeSearch = (value: string) => {
    setQuery(value);
    clearTimeout(timer.current);
    // Cancel the previous request immediately so a slow response cannot overwrite typing.
    cancelSearch.current?.();
    timer.current = setTimeout(() => go({ search: value.trim() }, true), 300);
  };

  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    go({ search: query.trim() }, true);
  };

  return (
    <>
      <Head>
        <title>Eventos · Admin</title>
      </Head>
      <Flash />
      <PageTitle
        title="Eventos"
        subtitle="Revisa todos los eventos de esta Tech Week y aprueba los enviados."
        action={<div className="font-mono text-xs text-muted-foreground">Total: {pagination.count} eventos</div>}
      />

      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center">
        <form onSubmit={submitSearch} className="relative flex-1 md:max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por título, empresa u organizador…"
            aria-label="Buscar eventos"
            value={query}
            onChange={(e) => changeSearch(e.target.value)}
            className="pl-9"
          />
          {query && (
            <button
              type="button"
              aria-label="Limpiar búsqueda"
              onClick={() => {
                setQuery('');
                go({ search: '' }, true);
              }}
              className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </form>
        <div className="flex items-center gap-2">
          <span className="label text-[10px] text-muted-foreground">Estado</span>
          <Select value={status} onValueChange={(value) => go({ status: value, search: query.trim() })}>
            <SelectTrigger className="w-64" aria-label="Filtrar por estado">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              {STATES.map((state) => (
                <SelectItem key={state} value={state}>
                  {STATE_LABELS[state]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-sm border border-dashed border-border py-16 text-center">
          <CalendarDays className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {search ? `Ningún evento coincide con “${search}”.` : status === 'all' ? 'No hay eventos para esta Tech Week.' : `No hay eventos en estado ${STATE_LABELS[status as EventState].toLowerCase()}.`}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {events.map((event) => (
            <li key={event.id}>
              <Link
                href={admin_event_path(week.slug, event.id)}
                className="block rounded-sm border border-border bg-card p-4 transition-colors hover:border-foreground"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h2 className="line-clamp-1 font-semibold">{event.title}</h2>
                  <StateBadge state={event.state} />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="size-3.5" />
                    {event.companyName}
                  </span>
                  <span className="flex items-center gap-1.5 font-mono">
                    <Clock className="size-3.5" />
                    {formatDateTime(event.submittedAt)}
                  </span>
                  <span className="font-mono">Edición {event.edition}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Pager pagination={pagination} buildHref={(page) => admin_events_path(week.slug) + buildQuery({ status, search, page })} />
    </>
  );
}
