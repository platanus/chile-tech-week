import { createInertiaApp } from '@inertiajs/react';
import { createElement } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { resolvePage, type ResolvedComponent } from '@/lib/resolve-page';

import '@/stylesheets/application.css';

createInertiaApp({
  progress: {
    color: '#EE2B2B',
    showSpinner: false,
  },
  resolve: (name) => {
    const pages = import.meta.glob<ResolvedComponent>('../pages/**/*.tsx', {
      eager: true,
    });
    return resolvePage(name, pages);
  },
  setup({ el, App, props }) {
    if (!el) {
      console.error(
        'Missing root element.\n\n' +
          'If you see this error, it probably means you loaded Inertia.js on a non-Inertia page.\n' +
          'Consider moving <%= vite_typescript_tag "inertia" %> to the Inertia-specific layout instead.',
      );
      return;
    }

    // Matches the tree ssr/ssr.tsx renders server-side, so an SSR'd page hydrates instead
    // of discarding the server markup.
    const app = createElement(App, props);

    if (el.hasChildNodes()) {
      hydrateRoot(el, app);
    } else {
      createRoot(el).render(app);
    }
  },
});
