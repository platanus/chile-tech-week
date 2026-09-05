# Chile Tech Week

The site behind [techweek.cl](https://techweek.cl) — Chile Tech Week 2026, Santiago,
16–22 November. The landing is the condor flight over the real Chile relief (streamed SRTM
tiles, OSM peaks, Overture buildings) with the flight game behind it.

## Stack

- Rails 8.1 · PostgreSQL · Propshaft + Vite (Inertia/React 19, TypeScript, Tailwind v4)
- Solid Queue / Cache / Cable · Mission Control Jobs
- alba + alba-inertia + typelizer · js-routes · pagy · anyway_config
- three.js for the scene (`app/frontend/landing`)
- RSpec · FactoryBot · Shoulda · Standard · lefthook

## Development

`POSTGRES_URL` and the rest of the development settings come from `.env.local` at the
repo root (see `.env.sample` for the production shape).

```bash
bundle install && npm ci
bin/dev-db                                            # local Postgres via docker compose (optional)
bin/rails db:prepare && RAILS_ENV=test bin/rails db:prepare
bin/dev                                               # rails + vite
bin/check                                             # ~5s: standardrb → zeitwerk → typelizer → tsc
bin/ci                                                # the above plus the vite build and vitest
```

Feature work happens in a worktree: `bin/start-worktree <name>` — see `AGENTS.md`.

## Terrain data

`public/terrain/cl-<hash>/` is the streamed dataset (relief tiles, buildings layer, places,
overview). It is committed; rebuild it with `npm run terrain:fetch`, `npm run buildings:fetch`
and `npm run places:fetch` (`scripts/terrain/`), which publish a new `cl-<hash>` directory and
point `app/frontend/terrain/terrain-url.ts` at it. The Rails layout reads that file for its
preload links, so nothing else needs updating.

## Deploying

Push to `main`. See "Deploying" in `AGENTS.md` for what actually happens and how to tell
a deploy landed.

## History

The landing was prototyped as a static Vite page in `platanus/chile-tech-week-25`
(the previous edition's repo); the brand exploration pages (`/brand`, `/logo`, `/lockup`)
live there and were not ported.
