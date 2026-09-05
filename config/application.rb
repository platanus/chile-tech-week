require_relative "boot"

require "rails"
# Pick the frameworks you want:
require "active_model/railtie"
require "active_job/railtie"
require "active_record/railtie"
require "active_storage/engine"
require "action_controller/railtie"
require "action_mailer/railtie"
require "action_view/railtie"
require "action_cable/engine"
# require "action_mailbox/engine"
# require "action_text/engine"
# require "rails/test_unit/railtie"

# Require the gems listed in Gemfile, including any gems
# you've limited to :test, :development, or :production.
Bundler.require(*Rails.groups)

# Development and test settings live in .env.local at the repo root; load it here
# (non-production only) so POSTGRES_URL and friends are visible before
# config/database.yml is read. Production reads a real .env on the server instead.
dotenv_path = File.expand_path("../.env.local", __dir__)

# `File.exist?` matters in CI, where there is no .env.local and POSTGRES_URL comes from
# the workflow instead — `Dotenv.parse` on a missing path raises.
if defined?(Dotenv) && !Rails.env.production? && File.exist?(dotenv_path)
  if Rails.env.test?
    # Specs must be deterministic on any machine, so the test environment takes
    # nothing from a developer's .env.local except what config/database.yml derives the
    # test databases from: the database URL, and the per-worktree TEST_DATABASE_PREFIX
    # that bin/start-worktree writes (absent on the main checkout, so the default in
    # database.yml applies). Every other setting comes from AppConfig's defaults.
    parsed = Dotenv.parse(dotenv_path)
    ENV["POSTGRES_URL"] ||= parsed["POSTGRES_URL"].to_s
    ENV["TEST_DATABASE_PREFIX"] ||= parsed["TEST_DATABASE_PREFIX"] if parsed["TEST_DATABASE_PREFIX"]
  else
    Dotenv.load(dotenv_path)
  end
end

module TechWeek
  class Application < Rails::Application
    # Initialize configuration defaults for originally generated Rails version.
    config.load_defaults 8.1

    # Please, add to the `ignore` list any other `lib` subdirectories that do
    # not contain `.rb` files, or that should not be reloaded or eager loaded.
    # Common ones are `templates`, `generators`, or `middleware`, for example.
    config.autoload_lib(ignore: %w[assets tasks])

    # We don't use Active Storage image variants — skip the image_processing dep warning.
    config.active_storage.variant_processor = :disabled

    # Don't generate system test files.
    config.generators.system_tests = nil

    # The site is Spanish-first.
    config.i18n.available_locales = [:es, :en]
    config.i18n.default_locale = :es
    config.i18n.fallbacks = [:en]
    config.time_zone = "Santiago"
  end
end
