# weeks is reference data: the CreateWeeks migration wrote both rows and db/seeds.rb
# keeps them, but a test database loaded from db/schema.rb starts without any. Write them
# once per suite, outside the per-example transaction, so every `edition:` in a factory or a
# spec has a week to point at.
RSpec.configure do |config|
  config.before(:suite) { Week.seed! }
end
