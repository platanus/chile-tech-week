# frozen_string_literal: true

# Base for every controller that renders an Inertia page.
class InertiaController < ApplicationController
  # Props are built by the Alba resources in app/serializers: set an instance variable
  # and `Alba::Inertia::Controller` picks the matching resource (see AGENTS.md).
  include Alba::Inertia::Controller

  # `pagy(:offset, scope, page:, limit:)` for every paginated page.
  include Pagy::Method
end
