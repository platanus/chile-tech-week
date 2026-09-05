# syntax=docker/dockerfile:1.4
ARG RUBY_VERSION=3.4.9

FROM ruby:${RUBY_VERSION}-alpine AS build

# Cache mount (not --no-cache) so the apk package index/downloads persist across
# builds instead of being re-fetched from scratch every time.
RUN --mount=type=cache,id=apk-build,target=/var/cache/apk \
    apk add build-base postgresql-dev tzdata bash yaml-dev git nodejs npm

ENV RAILS_ENV=production \
    NODE_ENV=production

WORKDIR /app

COPY Gemfile Gemfile.lock ./
# Cache the downloaded .gem files (not the extracted/compiled install path — that
# has to land in the regular image layer since the final stage COPYs it out) so a
# routine Gemfile.lock bump doesn't re-fetch every gem from rubygems.org, only the
# ones that actually changed.
RUN --mount=type=cache,id=bundle-cache,target=/root/.bundle-cache \
    bundle config set --local without 'development test' && \
    bundle config set --local cache_path /root/.bundle-cache && \
    bundle lock --add-platform x86_64-linux-musl && \
    n="$(nproc)"; if [ "$n" -gt 2 ]; then j=$((n - 2)); else j=1; fi && \
    bundle install --jobs "$j" && \
    bundle config unset --local cache_path

COPY package.json package-lock.json ./
# --include=dev: vite + vite-plugin-ruby (needed to build assets) are devDependencies,
# which NODE_ENV=production would otherwise skip. Cache mount avoids re-downloading
# unchanged packages from the npm registry on every package-lock.json change.
RUN --mount=type=cache,id=npm-cache,target=/root/.npm \
    npm ci --include=dev --prefer-offline

COPY . .

# Build Vite/Inertia assets (vite_rails hooks into assets:precompile).
RUN SECRET_KEY_BASE_DUMMY=1 bundle exec rake assets:precompile

FROM ruby:${RUBY_VERSION}-alpine AS app

# nodejs: the inertia_ssr Puma plugin spawns `node public/vite-ssr/ssr.js` alongside the
# Rails process, so the runtime image needs a node binary too, not just the build stage.
RUN --mount=type=cache,id=apk-app,target=/var/cache/apk \
    apk add postgresql-client tzdata bash yaml nodejs

ENV RAILS_ENV=production \
    RAILS_LOG_TO_STDOUT=true \
    RAILS_SERVE_STATIC_FILES=true

WORKDIR /app
COPY --from=build /usr/local/bundle /usr/local/bundle
COPY --from=build /app /app

EXPOSE 3000
CMD ["bin/rails", "server", "-b", "0.0.0.0"]
