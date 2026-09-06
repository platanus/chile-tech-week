import { type ComponentType, createElement, type ReactNode } from 'react';
import { AdminLayout } from '@/components/admin/layout';
import { Edition2025Layout } from '@/components/edition2025/layout';
import { SiteLayout } from '@/components/site/layout';

export type PageComponent = ComponentType & {
  layout?: (page: ReactNode) => ReactNode;
};

export type ResolvedComponent = {
  default: PageComponent;
};

// Assigns each page its shell by name prefix: the 2025 archive shares one, the landing is
// its own full-bleed page. Shared by the CSR (eager) and SSR (lazy) resolvers below so they
// can't drift on which pages get which shell. When another area grows a persistent layout,
// key on its prefix here the same way.
function attachLayout(name: string, page: ResolvedComponent): ResolvedComponent {
  if (page.default.layout) return page;
  if (name.startsWith('Edition2025/')) {
    page.default.layout = (content) => createElement(Edition2025Layout, null, content);
  } else if (name.startsWith('Events/')) {
    page.default.layout = (content) => createElement(SiteLayout, null, content);
  } else if (name.startsWith('Admin/') && !name.startsWith('Admin/Sessions/')) {
    page.default.layout = (content) => createElement(AdminLayout, null, content);
  }
  return page;
}

// CSR (entrypoints/inertia.ts): pages are eagerly bundled into the main chunk so
// resolution is synchronous — no network round-trip on client-side navigation.
export function resolvePage(name: string, pages: Record<string, ResolvedComponent>) {
  const page = pages[`../pages/${name}.tsx`];

  if (!page) {
    console.error(`Missing Inertia page component: '${name}.tsx'`);
    return page;
  }

  return attachLayout(name, page);
}

// SSR (ssr/ssr.tsx): pages load lazily instead, one per request. Eager-loading every page
// here would also evaluate browser-only code at server boot — three.js addons reference DOM
// globals Node doesn't have.
export async function resolvePageForSsr(
  name: string,
  pages: Record<string, () => Promise<ResolvedComponent>>,
) {
  const loader = pages[`../pages/${name}.tsx`];

  if (!loader) {
    // SSRRenderer (inertia_rails) rescues this and falls back to client-only rendering,
    // same as any other SSR failure.
    throw new Error(`Missing Inertia page component: '${name}.tsx'`);
  }

  // Inertia's SSR resolver type (unlike the sync/CSR one) only accepts
  // `Promise<ReactComponent>`, not `Promise<{ default: ReactComponent }>` — unwrap here.
  return attachLayout(name, await loader()).default;
}
