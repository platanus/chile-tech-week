# Agent guidelines — Chile Tech Week

Rails 8.1 + Inertia/React, one app, one database. The site behind techweek.cl: the landing is
the condor flight over the real Chile relief (`app/frontend/landing`), and everything else —
events, organizers, the programme — is still to be built on this setup. The structure, scripts
and workflow are the ones from `platanus/hack`; the landing was prototyped as a static Vite
page in `platanus/chile-tech-week-25`.

## Dev flow — one feature, one worktree

**Mandatory, no exceptions:** any feature or fix — however small — starts with
`bin/start-worktree <name>`. Don't ask, don't work in the main checkout, don't skip it
for "quick" changes. A PreToolUse hook (`.claude/hooks/guard-main-checkout.sh`) blocks
source edits in the main checkout while a linked worktree exists.

1. `bin/start-worktree <feature>` — `git worktree add` under `.claude/worktrees/<feature>`
   on branch `worktree-<feature>`, off freshly-fetched **`origin/main`**; copies `.env.local`
   and points it at the worktree's own databases; `npm ci` + `bundle install`; restores the
   latest local production dump into its dev database (`bin/db-dump-production` first if you
   want fresher data; `--empty` for a blank schema-loaded one — the right choice while the
   production database is still empty); creates its parallel_tests databases.
2. `cd .claude/worktrees/<feature>` and implement there. `bin/check` constantly,
   `bin/ci` green before every commit.
3. `git push origin HEAD:main` (rebase on `origin/main` first if it moved). The pre-push
   hook runs the full RSpec suite — that is the one automated test gate.
4. **Wait for the deploy and verify in prod** — `gh run watch`, then confirm the build
   actually landed (see "Deploying"; the GitHub job going green is not that).
5. Only then `bin/teardown-worktree` from inside the worktree. It refuses on uncommitted
   or unpushed work, stops the stack, drops the worktree's databases, removes the
   worktree and deletes its branch.

Each checkout derives its own identity from `bin/dev-env`:

| | main checkout | linked worktree |
|---|---|---|
| dev database | whatever `POSTGRES_URL` names (`tech_week_dev`) | `tech_week_dev_<slug>` |
| test databases | `tech_week_test`, `…2` … | `tech_week_test_<slug>`, `…2` … |
| Rails / Vite | :3000 / :3036 | `20xxx` / `21xxx`, from a hash of the path |

The database names travel in the worktree's `.env.local` (`POSTGRES_URL`,
`TEST_DATABASE_PREFIX`), so every `bin/rails`, `parallel_rspec` and lefthook run inside
the worktree hits the worktree's databases with nothing to source. The ports only apply
through `bin/dev`: a bare `bin/rails s` in a worktree still defaults to :3000.

Never create worktrees by hand (`git worktree add`, or the harness's own worktree
support): their `.env.local` still points at the main checkout's database, and `bin/dev`
refuses to start in such a worktree.

## Git

- Commit and push straight to `main` — **no feature branches, no PRs** unless
  explicitly asked. The `worktree-<name>` branch is local plumbing: push its commits with
  `git push origin HEAD:main`, never push the branch itself.
- Only commit or push when asked.
- `lefthook` runs standardrb + tsc on pre-commit and RSpec + Vitest on pre-push. Hooks
  live in the shared `.git/hooks`, so worktrees get them for free. **Never** skip them
  with `--no-verify`: CI does not run the tests, so `git push --no-verify` is the one
  command that puts untested code on production.
- Leave files you didn't touch alone, including untracked leftovers — another session
  may be working in the same checkout.
- Pushing to `main` deploys to production.

## Quality gate

Three nested scripts, each a superset of the one above it:

| script | steps | where it runs |
|---|---|---|
| `bin/check` (~5s) | standardrb, `zeitwerk:check`, `typelizer:generate`, tsc | the inner loop — run it constantly |
| `bin/ci-checks` | the above, a stale-`schema.rb` check, plus a real `vite build` | **GitHub Actions**, on every push |
| `bin/ci` | the above, plus Vitest | locally, before every commit |

`bin/ci` deliberately does **not** run RSpec — the suite only runs in lefthook's
pre-push hook. RSpec runs via `parallel_tests` (`bundle exec parallel_rspec spec`, one
database per worker via `TEST_ENV_NUMBER`), never plain `rspec` for the whole suite. After
a schema change, recreate the test databases with `bundle exec rake parallel:load_schema[8]`.
Workers share one `public/vite-test` build, so build it explicitly first
(`RAILS_ENV=test bin/vite build`) — the pre-push hook does.

Run `bin/rails js:routes:typescript` after changing `config/routes.rb` — nothing catches
a stale `app/frontend/routes.js` unless the frontend imports the affected helper.

Caches CI relies on, none of which should be invalidated casually: the bundle (keyed on
`Gemfile.lock`), the npm cache (keyed on `package-lock.json` — use `npm ci`, never
`npm install`, which may rewrite it), and tsc's incremental `.tsbuildinfo` under
`node_modules/.tmp`. On the server, deploys reuse the Docker layer cache and BuildKit
cache mounts; `scripts/deploy-production.sh` never prunes.

## Local dev

`bin/dev` runs `Procfile.dev` (Rails + Vite) under Overmind, foreground; Ctrl-C stops
everything. For an agent, run it daemonized and poll:

```bash
OVERMIND_DAEMONIZE=1 bin/dev          # prints this checkout's URLs
overmind status; curl -s localhost:$PORT/up
overmind echo                         # streams new output; log/development.log has history
overmind quit
```

Overmind's socket is per-directory, so each worktree's stack is independent.

- **`POSTGRES_URL`** (from `.env.local`; from the server's `.env` in production) is the
  only thing that decides which Postgres you talk to. `bin/db-dump-production` (pg_dump over
  SSH into `dumps/`, gitignored), `bin/db-restore [dump]` (recreate the `POSTGRES_URL`
  database from a dump, then `db:migrate`) and `bin/db-pull` (both) connect with plain
  `psql`/`pg_restore` straight at `POSTGRES_URL`'s host:port — not necessarily the
  `docker-compose.dev.yml` container (`bin/dev-db`).
- The landing has no database of its own: `GET /` works against an empty schema.

## Database

- `db/schema.rb` is the source of truth; load it into the test database with
  `RAILS_ENV=test bin/rails db:schema:load`.
- `db/migrate/` (plus `db/{cache,queue,cable}_migrate/` for the three Solid databases)
  holds real, deploy-applied migrations. `scripts/deploy-production.sh` runs `db:prepare`
  on every deploy, which creates and migrates all four databases together.
- `strong_migrations` is on (`config/initializers/strong_migrations.rb`, 10s lock
  timeout). Write migrations normally; it stops you on the patterns that lock a table.

## Deploying

Pushing to `main` runs `.github/workflows/deploy.yml`: `bin/ci-checks` against a
Postgres service, then a tar/scp/ssh dispatch onto the `swiss` Hetzner host
(`$HETZNER_REPO_DIR`, `/home/debian/swiss-composes/tech-week`), which runs
`scripts/deploy-production.sh` there. That script is **fire-and-forget** — the GitHub
job goes green as soon as the deploy is *started*, and the real `docker compose build`
runs on for minutes afterwards. To know a deploy actually landed:

```bash
gh run watch                                                     # the dispatch
ssh swiss "docker image inspect -f '{{.Created}}' tech-week-app:latest; tail -n 3 /home/debian/swiss-composes/tech-week/.deploy.log"
```

and look for `Deploy complete` — or wait for the Slack notification. Then check the
behaviour actually changed on the site before tearing the worktree down.

Nginx Proxy Manager on the host terminates TLS and routes techweek.cl to
`tech-week-app:3000` over the shared `npm` docker network; Cloudflare sits in front.

## Inertia Rails stack

- **Frontend**: React 19 with @inertiajs/react 3.x (TypeScript, Tailwind v4, Vite via
  vite_rails) under `app/frontend`. SSR is on (`config/vite.json`, the `inertia_ssr` Puma
  plugin); a page that touches the DOM at import time breaks it — keep browser-only code
  inside effects, as `pages/Home/Show.tsx` does.
- **Tailwind is loaded without preflight** (`stylesheets/application.css`): the landing's
  CSS relies on browser defaults. Utilities work everywhere; there is no global reset.
- **Serialization**: alba-inertia convention-based rendering. Set instance variables —
  `Alba::Inertia::Controller` auto-detects resources. Do NOT use `render inertia: { ... }`
  directly. This overrides render patterns from other Inertia skills.
- **Types**: Typelizer auto-generates TypeScript from Alba resources into
  `app/frontend/types/generated`. Do NOT manually edit generated files.
- **UI**: shadcn/ui adapted for Inertia (`npx shadcn@latest add <component>` lands in
  `app/frontend/components/ui`). NEVER react-hook-form, zod, FormField, FormItem, or
  FormMessage — use Inertia `<Form>` with plain shadcn inputs. Tailwind v4: use `gap-*`,
  not `space-*`.
- **Pagination**: Pagy. Use pagy helper in controllers, pass pagy_metadata as prop.
- **Testing**: RSpec with inertia_rails/rspec matchers. Use render_component,
  have_props, have_flash — NOT direct property access. `follow_redirect!` after
  POST/PATCH/DELETE.
- **Routing**: js-routes for typed path helpers.
- **Config**: typed ENV via `AppConfig` (anyway_config, `app/configs/app_config.rb`,
  `AppConfig.instance.site_url`). Add new settings there, not `ENV[...]` scattered around.
- **Architecture**: Server owns routing, data, and auth. React renders only. See
  `inertia-rails-architecture` for the decision matrix.

## The landing and the game

`pages/Home/Show.tsx` renders the prototype's `<body>` markup; `stylesheets/landing.css` is
its `<style>` block; `landing/logo.ts` and `landing/scene.ts` are its two scripts, verbatim,
each wrapped in one exported function the page calls on mount. `scene.ts` is ~1,800 lines
of three.js under `// @ts-nocheck` on purpose: it is an exact copy, kept diffable against
the original. Its `DEFAULTS` object is the tuning surface (start position, speed, colours,
quality tiers); the lil-gui panel (`H` in game mode) edits the same object live and "copy
settings JSON" prints it.

The terrain the scene streams is `public/terrain/cl-<hash>/` (committed, ~14 MB,
immutable-by-path). `scripts/terrain/*.ts` rebuild it (`npm run terrain:fetch`,
`buildings:fetch`, `places:fetch`; raw downloads cache under `scripts/terrain/.cache`) and
publish a new `cl-<hash>` directory, writing it into `app/frontend/terrain/terrain-url.ts`.
`TerrainAssets` (Ruby) reads that same file for the layout's `<link rel=preload>` tags, so
a dataset swap is one generated file plus the directory — nothing to update by hand.
