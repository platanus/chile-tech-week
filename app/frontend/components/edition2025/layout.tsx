import { Head } from '@inertiajs/react';
import type { ReactNode } from 'react';
import type { Edition2025Page } from '@/types';

// The 2025 pages' shell: the .ed25 wrapper edition2025.css scopes its reset and type to, the
// old site's footer, and the font it used. Attached by name prefix in lib/resolve-page.ts.
export function Edition2025Layout({ children }: { children: ReactNode }) {
  return (
    <div className="ed25 flex min-h-screen flex-col">
      <Head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700;800&display=swap"
        />
        <link rel="icon" href="/25/icon.svg" type="image/svg+xml" />
      </Head>
      <main className="flex-1">{children}</main>
      <footer className="mt-12 border-t-8 border-primary bg-black py-6">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <div className="flex items-center justify-center gap-3">
            <p className="font-mono text-sm font-bold uppercase tracking-wider text-white">
              CHILE TECH WEEK 2025
            </p>
            <a
              href="https://github.com/platanus/chile-tech-week"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              className="text-white transition-colors hover:text-primary"
            >
              <GitIcon />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

// The document title and description of one 2025 page, for the tab and client navigation.
// The OpenGraph, Twitter and canonical tags are the server's (MetaTagsHelper, absolute
// URLs), whether or not SSR renders this <Head>.
export function PageHead({ title, description }: Edition2025Page) {
  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
    </Head>
  );
}

// The old site's three-line wordmark: red, faded red, white.
export function Wordmark({ size = 'hero' }: { size?: 'hero' | 'small' }) {
  const text =
    size === 'hero'
      ? 'font-mono text-xl font-black uppercase tracking-wider md:text-6xl lg:text-7xl'
      : 'font-mono text-sm font-black uppercase tracking-wider md:text-2xl lg:text-3xl';
  return (
    <div className="text-center">
      <div className={`${text} text-primary`}>CHILE TECH WEEK 2025</div>
      <div className={text} style={{ color: 'hsl(0, 60%, 70%)' }}>
        CHILE TECH WEEK 2025
      </div>
      <div className={`${text} text-white`}>CHILE TECH WEEK 2025</div>
    </div>
  );
}

function GitIcon() {
  return (
    <svg height="16" width="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}
