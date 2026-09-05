class ApplicationResource
  include Alba::Resource

  helper Typelizer::DSL
  helper Alba::Inertia::Resource

  include Rails.application.routes.url_helpers

  # Props are emitted in lowerCamelCase, the React side's convention (`startLat`, `tileKm`).
  transform_keys :lower_camel
end
