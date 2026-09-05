# frozen_string_literal: true

InertiaRails.configure do |config|
  config.version = ViteRuby.digest
  # The Puma plugin (config/puma.rb) spawns the SSR bundle vite builds to public/vite-ssr/ssr.js
  # (config/vite.json's ssrBuildEnabled) and serves it on DEFAULT_SSR_URL; a render failure or
  # the process being down falls back to client-side rendering, so this is safe to leave on
  # even before the bundle exists (e.g. mid-deploy). Off in test: no SSR process ever runs
  # there, and WebMock raises Exception (not StandardError) on the blocked request, which is
  # outside what SSRRenderer's `rescue StandardError` catches.
  config.ssr_enabled = !Rails.env.test?
  config.encrypt_history = true
  config.always_include_errors_hash = true
  config.use_script_element_for_initial_page = true
  config.use_data_inertia_head_attribute = true

  # Inertia pages render inside a dedicated layout (app/views/layouts/inertia.html.erb)
  config.layout = "inertia"

  # Page components live at app/frontend/pages/<Area>/<Page>.tsx, so the component a controller
  # renders by convention is "Admin/Events/Index", not "admin/events/index". A controller whose
  # page does not follow its own name renders it explicitly with `render_inertia "Some/Page"`.
  config.component_path_resolver = lambda do |path:, action:|
    "#{path.split("/").map(&:camelize).join("/")}/#{action.camelize}"
  end
end
