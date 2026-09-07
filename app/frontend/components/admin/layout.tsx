import { Link, router, usePage } from '@inertiajs/react';
import { CalendarDays, Clock, LogOut, Mail } from 'lucide-react';
import type { ReactNode } from 'react';
import { useWeek } from '@/components/admin/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  admin_events_path,
  admin_outbound_emails_path,
  admin_tasks_path,
  destroy_user_session_path,
  root_path,
} from '@/routes';
import { cn } from '@/lib/utils';

// The three areas, each a section of one Tech Week: /admin/26/events, /admin/26/emails,
// /admin/26/tasks. `section` is what the URL's third segment says, and what the week
// switcher keeps hold of when it moves you to another edition.
const NAV = [
  { title: 'Eventos', section: 'events', icon: CalendarDays, href: admin_events_path },
  { title: 'Correos', section: 'emails', icon: Mail, href: admin_outbound_emails_path },
  { title: 'Tareas', section: 'tasks', icon: Clock, href: admin_tasks_path },
];

// The moderation panel's shell: a sidebar with the week switcher, the three areas and the
// signed-in admin, the page beside it. The black brand palette — only the wordmark uses
// the display face.
export function AdminLayout({ children }: { children: ReactNode }) {
  const { url, props } = usePage();
  const email = props.currentUser?.email;
  const week = useWeek();
  const weeks = props.weeks ?? [week];
  const section = NAV.find((item) => item.section === url.split('?')[0].split('/')[3]) ?? NAV[0];

  return (
    <div className="site flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-secondary">
        <div className="border-b border-border px-5 py-5">
          {/* a real navigation: the landing's scene only starts on a fresh document */}
          <a href={root_path()} className="font-display text-[15px] font-extrabold tracking-[-0.02em]">
            CLTW<b className="text-primary">26</b>
          </a>
          <div className="label mt-1 text-muted-foreground">Admin</div>
          {/* Switching edition keeps you in the same area, at that week's own address. */}
          <Select value={week.slug} onValueChange={(slug) => router.visit(section.href(slug))}>
            <SelectTrigger size="sm" className="mt-3 w-full bg-background" aria-label="Cambiar de Tech Week">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {weeks.map((option) => (
                <SelectItem key={option.slug} value={option.slug}>
                  Tech Week {option.year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {NAV.map((item) => (
            <Link
              key={item.section}
              href={item.href(week.slug)}
              className={cn(
                'flex items-center gap-3 rounded-sm px-3 py-2 text-sm font-semibold transition-colors',
                item.section === section.section ? 'bg-foreground text-background' : 'hover:bg-accent',
              )}
            >
              <item.icon className="size-4" />
              {item.title}
            </Link>
          ))}
        </nav>
        <div className="flex flex-col gap-2 border-t border-border p-3">
          <div className="truncate px-3 font-mono text-xs text-muted-foreground" title={email}>
            {email}
          </div>
          <button
            type="button"
            onClick={() => router.delete(destroy_user_session_path())}
            className="flex items-center gap-3 rounded-sm px-3 py-2 text-sm font-semibold transition-colors hover:bg-accent"
          >
            <LogOut className="size-4" />
            Salir
          </button>
        </div>
      </aside>
      {/* role, not <main>: landing.css styles that tag (see components/site/layout.tsx) */}
      <div role="main" className="min-w-0 flex-1 px-8 py-8">
        {children}
      </div>
    </div>
  );
}
