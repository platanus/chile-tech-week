---
paths:
  - "app/**/*.rb"
  - "config/**/*.rb"
  - "lib/**/*.rb"
  - "spec/**/*.rb"
---

# Rails backend rules

- Controllers that render a page inherit from `InertiaController` and set instance
  variables; `Alba::Inertia::Controller` picks the matching resource in `app/serializers`.
  Do not `render inertia: {...}` by hand.
- Typed settings live in `AppConfig` (`app/configs/app_config.rb`). No `ENV[...]` elsewhere.
- Authorization is a `before_action`. External services live in `app/clients/`; specs stub
  them, never the network (WebMock blocks it).
- Specs: `require "rails_helper"`, `inertia_rails/rspec` matchers (`render_component`,
  `have_props`, `have_flash`), `follow_redirect!` after POST/PATCH/DELETE.
- Migrations go through `strong_migrations`; recreate the test databases after a schema
  change (`bundle exec rake parallel:load_schema[8]`).
