Typelizer.configure do |config|
  config.output_dir = Rails.root.join("app/frontend/types/generated")

  # `timestamp with time zone` columns report as :timestamptz, a type Typelizer does not know
  # (it would emit `unknown`). They serialize to ISO-8601 strings, same as :datetime.
  config.type_mapping = Typelizer::TYPE_MAPPING.merge(timestamptz: :string)
end
