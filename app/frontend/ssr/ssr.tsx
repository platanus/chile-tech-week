import { createInertiaApp } from '@inertiajs/react';
import createServer from '@inertiajs/react/server';
import { createElement } from 'react';
import ReactDOMServer from 'react-dom/server';
import { resolvePageForSsr, type ResolvedComponent } from '@/lib/resolve-page';

createServer((page) =>
  createInertiaApp({
    page,
    render: ReactDOMServer.renderToString,
    resolve: (name) => {
      const pages = import.meta.glob<ResolvedComponent>('../pages/**/*.tsx');
      return resolvePageForSsr(name, pages);
    },
    setup: ({ App, props }) => createElement(App, props),
  }),
);
