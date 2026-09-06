import { Link, router, usePage } from '@inertiajs/react';
import { CalendarDays, Clock, LogOut, Mail } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  admin_events_path,
  admin_outbound_emails_path,
  admin_tasks_path,
  destroy_user_session_path,
  root_path,
} from '@/routes';
import { cn } from '@/lib/utils';

const NAV = [
  { title: 'Eventos', href: admin_events_path(), icon: CalendarDays, prefix: '/admin/events' },
  { title: 'Correos', href: admin_outbound_emails_path(), icon: Mail, prefix: '/admin/emails' },
  { title: 'Tareas', href: admin_tasks_path(), icon: Clock, prefix: '/admin/tasks' },
];

// The moderation panel's shell: a sidebar with the three areas and the signed-in admin, the
// page beside it. Light and plain on purpose — only the wordmark uses the display face.
export function AdminLayout({ children }: { children: ReactNode }) {
  const { url, props } = usePage();
  const email = props.currentUser?.email;

  return (
    <div className="site site-light flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-secondary">
        <div className="border-b border-border px-5 py-5">
          {/* a real navigation: the landing's scene only starts on a fresh document */}
          <a href={root_path()} className="font-display text-[15px] font-extrabold tracking-[-0.02em]">
            CLTW<b className="text-primary">26</b>
          </a>
          <div className="label mt-1 text-muted-foreground">Admin</div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {NAV.map((item) => {
            const active = url.startsWith(item.prefix);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-sm px-3 py-2 text-sm font-semibold transition-colors',
                  active ? 'bg-foreground text-background' : 'hover:bg-accent',
                )}
              >
                <item.icon className="size-4" />
                {item.title}
              </Link>
            );
          })}
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
