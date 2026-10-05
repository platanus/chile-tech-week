# The public routes sit in an optional (:locale) scope (Localized). Name the locale in the
# specs' own URL helpers, as the controllers do, so a positional `event_path(event)` means the
# event and not `locale: event`: Spanish by default, `event_path(event, locale: "en")` for /en.
RSpec.configure do |config|
  config.before(type: :request) { default_url_options[:locale] = nil }
end
