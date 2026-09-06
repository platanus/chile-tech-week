import { Head, Link } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { events_path, new_event_path, root_path } from '@/routes';

// The shell of the 2026 pages other than the landing: the brand top left, the two things a
// visitor does (see the programme, organise an event), the landing's footer. Attached by name
// prefix in lib/resolve-page.ts; site.css scopes its reset and tokens to .site. No <main> or
// <footer> elements here: landing.css styles those two by tag (padding, colours, `main h2`),
// and its layer sits under the utilities but above a bare element's defaults.
export function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="site flex min-h-screen flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-border px-[8vw] py-5">
        {/* a real navigation, not a <Link>: the landing's scene only starts on a fresh
            document (app/frontend/landing/exit.ts) */}
        <a href={root_path()} className="font-display text-[15px] font-extrabold tracking-[-0.02em]">
          CLTW<b className="text-primary">26</b>
        </a>
        <nav className="flex items-center gap-2 sm:gap-4">
          <Link href={events_path()} className="label px-2 py-2 text-foreground transition-colors hover:text-primary">
            Eventos
          </Link>
          <Link
            href={new_event_path()}
            className="inline-flex items-center rounded-sm border border-primary bg-primary px-4 py-2.5 font-display text-[11px] font-extrabold uppercase tracking-[.04em] text-white transition-colors hover:bg-[#ff3d3d]"
          >
            Organiza un evento
          </Link>
        </nav>
      </header>
      {/* role, not <main>: landing.css styles that tag by name (see above) */}
      <div role="main" className="flex-1">
        {children}
      </div>
      <div
        role="contentinfo"
        className="label flex flex-wrap justify-between gap-x-7 gap-y-2.5 border-t border-border px-[8vw] py-6 text-muted-foreground"
      >
        <span>Chile Tech Week 2026</span>
        <span>#CTW2026</span>
        <a href="/brand/" className="hover:text-foreground">
          Marca
        </a>
      </div>
    </div>
  );
}

// The document title and description of one page, for the tab and client navigation. The
// OpenGraph, Twitter and canonical tags are the server's (MetaTagsHelper).
export function PageHead({ title, description }: { title: string; description: string }) {
  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
    </Head>
  );
}
