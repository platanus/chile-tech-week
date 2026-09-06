source "https://rubygems.org"

gem "rails", "~> 8.1"
gem "propshaft"
gem "pg", "~> 1.1"
gem "puma", ">= 5.0"
gem "tzinfo-data", platforms: %i[windows jruby]
gem "solid_cache"
gem "solid_queue"
gem "solid_cable"
gem "mission_control-jobs"
gem "bootsnap", require: false
gem "thruster", require: false

# Inertia + serialization
gem "inertia_rails", "~> 3.21"
gem "vite_rails", "~> 3.11"
gem "alba"
gem "alba-inertia"
gem "typelizer"
gem "js-routes"
gem "pagy"

# Config
gem "anyway_config", "~> 2.0"

# Admin sign-in (Devise) and Spanish messages for it and for validations
gem "devise"
gem "devise-i18n"
gem "rails-i18n", "~> 8.0"

# Misc
gem "strong_migrations"
gem "meta-tags", "~> 2.22"

group :development, :test do
  gem "debug", platforms: %i[mri windows], require: "debug/prelude"
  gem "brakeman", require: false
  gem "bundler-audit", require: false
  gem "rspec-rails"
  gem "factory_bot_rails"
  gem "faker"
  gem "dotenv-rails"
  gem "lefthook", require: false
end

group :test do
  gem "shoulda-matchers"
  gem "webmock"
  gem "parallel_tests"
end

group :development do
  gem "web-console"
  gem "standard", ">= 1.35.1", require: false
  gem "standard-rails", require: false
end
