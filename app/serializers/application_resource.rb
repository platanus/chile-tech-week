class ApplicationResource
  include Alba::Resource

  helper Typelizer::DSL
  helper Alba::Inertia::Resource

  include Rails.application.routes.url_helpers

  # Props are emitted in lowerCamelCase, the React side's convention (`startLat`, `tileKm`).
  transform_keys :lower_camel

  # Links built here stay in the page's language: `public_event_path(slug:, **url_locale)`.
  def url_locale
    {locale: (I18n.locale == :en) ? "en" : nil}
  end
end
