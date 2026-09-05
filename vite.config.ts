import inertia from '@inertiajs/vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import RubyPlugin from 'vite-plugin-ruby';

export default defineConfig({
  plugins: [tailwindcss(), RubyPlugin(), inertia(), react()],
  // Cheap insurance against a duplicate React in the tree: a dependency resolving against a
  // second copy throws "Invalid hook call" at runtime while tsc and `vite build` stay green.
  resolve: { dedupe: ['react', 'react-dom'] },
  // Touching this file is also how a stale dev server is forced to restart — a new
  // app/frontend/pages/<Area>/ directory otherwise leaves it serving a pre-warmed dep bundle
  // and every page 504s with "Outdated Optimize Dep".
});
