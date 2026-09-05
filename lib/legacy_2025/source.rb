require "pg"

module Legacy2025
  # The 2025 site's own Postgres database (its Drizzle tables), read table by table as
  # string-keyed rows — the shape Legacy2025::Importer maps onto this app's schema.
  class Source
    TABLES = {
      events: "Events",
      themes: "EventThemes",
      audiences: "EventAudiences",
      event_themes: "EventThemeRelations",
      event_audiences: "EventAudienceRelations",
      cohosts: "EventCohosts"
    }.freeze

    def initialize(url)
      @url = url
    end

    TABLES.each do |name, table|
      define_method(name) { connection.exec(%(SELECT * FROM "#{table}")).to_a }
    end

    private

    def connection
      @connection ||= PG.connect(@url)
    end
  end
end
