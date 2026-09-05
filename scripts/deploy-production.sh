#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${REPO_DIR:-/home/debian/swiss-composes/tech-week}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.production.yml}"
ENV_FILE="${ENV_FILE:-$REPO_DIR/.env}"
DEPLOY_SHA="${DEPLOY_SHA:-unknown}"
DEPLOY_REPO="${DEPLOY_REPO:-}"
DEPLOY_ACTOR="${DEPLOY_ACTOR:-unknown}"
DEPLOY_ENV="${DEPLOY_ENV:-production}"
DEPLOY_COMMIT_MESSAGE_B64="${DEPLOY_COMMIT_MESSAGE_B64:-}"

SECONDS=0
current_step="starting"

step_start=0
step_begin() {
  current_step="$1"
  step_start=$SECONDS
  echo "==> [${SECONDS}s] start: $1"
}
step_end() {
  local took=$((SECONDS - step_start))
  echo "==> [${SECONDS}s] done:  $current_step ($(format_duration $took))"
}

format_duration() {
  local s=$1
  if [ "$s" -ge 60 ]; then
    printf '%dm %ds' $((s / 60)) $((s % 60))
  else
    printf '%ds' "$s"
  fi
}

format_size() {
  awk -v b="$1" 'BEGIN {
    split("B KB MB GB TB", u, " "); i = 1
    while (b >= 1024 && i < 5) { b /= 1024; i++ }
    printf (i == 1 ? "%d %s" : "%.2f %s"), b, u[i]
  }'
}

app_image_size() {
  local id bytes
  id=$(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" images -q app 2>/dev/null | head -1)
  [ -z "$id" ] && return
  bytes=$(docker image inspect "$id" --format '{{.Size}}' 2>/dev/null)
  [ -z "$bytes" ] && return
  format_size "$bytes"
}

commit_sha() {
  local sha="${DEPLOY_SHA//$'\n'/}"
  sha="${sha//$'\r'/}"
  sha="${sha#"${sha%%[![:space:]]*}"}"
  sha="${sha%"${sha##*[![:space:]]}"}"
  if [ -z "$sha" ] || [ "$sha" = "unknown" ]; then
    sha=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
  fi
  printf '%s' "$sha"
}

commit_link() {
  local sha short
  sha=$(commit_sha)
  short=${sha:0:7}
  if [ -n "$DEPLOY_REPO" ] && [ "$sha" != "unknown" ]; then
    printf '<https://github.com/%s/commit/%s|%s>' "$DEPLOY_REPO" "$sha" "$short"
  else
    printf '`%s`' "$short"
  fi
}

commit_subject() {
  local subject=""
  if [ -n "$DEPLOY_COMMIT_MESSAGE_B64" ]; then
    subject=$(printf '%s' "$DEPLOY_COMMIT_MESSAGE_B64" | base64 --decode 2>/dev/null || true)
  fi
  if [ -z "$subject" ]; then
    local sha
    sha=$(commit_sha)
    [ "$sha" != "unknown" ] && subject=$(git show -s --format=%s "$sha" 2>/dev/null || true)
  fi
  subject="${subject//$'\r'/}"
  subject="${subject//$'\n'/ }"
  printf '%s' "$subject"
}

project_name() {
  if [ -n "$DEPLOY_REPO" ]; then
    printf '%s' "${DEPLOY_REPO##*/}"
  else
    basename "$(pwd)"
  fi
}

send_slack() {
  [ -z "${SLACK_BOT_TOKEN:-}" ] && return 0
  [ -z "${SLACK_CHANNEL:-}" ] && return 0
  local text=$1
  local payload
  payload=$(python3 - "$SLACK_CHANNEL" "$text" <<'PY'
import json
import sys

print(json.dumps({
    "channel": sys.argv[1],
    "text": sys.argv[2],
    "mrkdwn": True,
}))
PY
)
  curl -sS -o /dev/null -X POST "https://slack.com/api/chat.postMessage" \
    -H "Authorization: Bearer $SLACK_BOT_TOKEN" \
    -H 'Content-Type: application/json; charset=utf-8' \
    --data "$payload" || true
}

notify_success() {
  local duration image subject
  duration=$(format_duration "$SECONDS")
  image=$(app_image_size)
  subject=$(commit_subject)
  local msg=":white_check_mark: deployed *$(project_name)* to *${DEPLOY_ENV}* · $(commit_link) by ${DEPLOY_ACTOR} · ${duration}"
  [ -n "$subject" ] && msg="${msg}
> ${subject}"
  [ -n "$image" ] && msg="${msg}
:whale: ${image}"
  send_slack "$msg"
}

log_tail() {
  [ -f "$REPO_DIR/.deploy.log" ] || return 0
  tail -n 30 "$REPO_DIR/.deploy.log" | tail -c 2500
}

notify_failure() {
  local subject tail_block
  subject=$(commit_subject)
  local msg=":x: deploy failed for *$(project_name)* on *${DEPLOY_ENV}* at *${current_step}* · $(commit_link) by ${DEPLOY_ACTOR}"
  [ -n "$subject" ] && msg="${msg}
> ${subject}"
  tail_block=$(log_tail)
  [ -n "$tail_block" ] && msg="${msg}
\`\`\`
${tail_block}
\`\`\`"
  send_slack "$msg"
}

on_failure() {
  local exit_code=$?
  notify_failure
  exit "$exit_code"
}

trap on_failure ERR

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Environment file not found: $ENV_FILE"
  exit 1
fi

cd "$REPO_DIR"

step_begin "git-sync"
if [[ "${SKIP_GIT_SYNC:-0}" != "1" ]]; then
  git fetch origin main
  git reset --hard origin/main
fi
step_end

dc() {
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

step_begin "database"
dc up -d postgres
step_end

step_begin "app-build"
dc build app
step_end

# All four databases (primary + Solid Cache/Queue/Cable, config/database.yml) are under
# normal Rails migration control as of Phase 6 of docs/db-migration/plan.md. Load-bearing
# ordering, learned the hard way on 2026-09-01 (see the plan's incident notes):
#
# `db:baseline` and `db:baseline:solid` MUST run before `db:prepare` ever touches any of
# these databases. This is a multi-database app, and both `db:migrate` and `db:prepare`
# funnel through ActiveRecord::Tasks::DatabaseTasks, which unconditionally calls
# `initialize_database` on *every* configured database before migrating anything — and
# for any database whose own `schema_migrations` table doesn't exist yet, that loads its
# schema.rb-format dump straight over the live database. For `primary` that meant loading
# db/structure.sql over the already-populated tech_week_prod and aborting on the first
# "already exists" conflict (harmless that time — two cosmetic COMMENT statements — but
# not something to rely on twice). For cache/queue/cable it would be worse: their
# db/{cache,queue,cable}_schema.rb dumps all declare `force: :cascade`, so the first
# unguarded db:prepare would silently drop every Solid Queue table and every job in it.
# Both baseline tasks are idempotent — safe to run every deploy even once neither is
# doing anything anymore.
#
# db:prepare (not db:setup_solid, not a scoped db:migrate:primary) is what actually
# applies pending migrations now, because it's the one task that correctly handles all
# four databases together once each is baselined.
step_begin "database-setup"
dc run --rm app bin/rails db:baseline db:baseline:solid db:prepare
step_end

# --remove-orphans clears out the previous stack's `migrator` and `cron-ticker`
# containers; Solid Queue's recurring schedule replaces the latter.
step_begin "startup"
dc up -d postgres app jobs --remove-orphans
step_end

# No image or builder prune here, deliberately. Every deploy leans on the daemon's layer
# cache and on the Dockerfile's BuildKit cache mounts (apk index, the gem download cache,
# ~/.npm) — those live in the builder, and pruning is what makes the next deploy re-fetch
# every gem and package from scratch. Old images are cheap; cold builds are not. Clean up
# by hand when the disk actually needs it.

if [[ -n "${CLOUDFLARE_ZONE_ID:-}" && -n "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  current_step="cloudflare-purge"
  curl -sS -X POST \
    "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/purge_cache" \
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
    -H "Content-Type: application/json" \
    --data '{"purge_everything":true}' >/dev/null || true
fi

echo "==> Deploy complete in ${SECONDS}s"
notify_success
