require "spec_helper"
ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment"
# Prevent database truncation if the environment is running in production mode
abort("The Rails environment is running in production mode!") if Rails.env.production?
require "rspec/rails"
require "shoulda/matchers"
require "inertia_rails/rspec"
require "webmock/rspec"

# Specs never touch the network. Every external client is stubbed or answered by WebMock.
WebMock.disable_net_connect!(allow_localhost: false)

Shoulda::Matchers.configure do |config|
  config.integrate do |with|
    with.test_framework :rspec
    with.library :rails
  end
end

Rails.root.glob("spec/support/**/*.rb").sort_by(&:to_s).each { |f| require f }

# Ensures that the test database schema matches the current schema file.
begin
  ActiveRecord::Migration.maintain_test_schema!
rescue ActiveRecord::PendingMigrationError => e
  abort e.to_s.strip
end

RSpec.configure do |config|
  config.include FactoryBot::Syntax::Methods
  config.include ActiveJob::TestHelper
  config.include ActiveSupport::Testing::TimeHelpers

  config.fixture_paths = [Rails.root.join("spec/fixtures")]
  config.use_transactional_fixtures = true
  config.infer_spec_type_from_file_location!
  config.filter_rails_from_backtrace!
end
