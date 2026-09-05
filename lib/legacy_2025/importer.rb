module Legacy2025
  # Copies the 2025 site's events, themes, audiences, their links and the co-hosts into this
  # app's tables, keeping every id, timestamp and value. Upserts by primary key, so it can be
  # re-run on a database that already holds the archive. `source` is anything answering the
  # six table readers of Legacy2025::Source with arrays of string-keyed rows.
  class Importer
    EDITION = 2025
    # Postgres enum value of the old schema → this app's state name.
    STATES = {"waiting-luma-edit" => "waiting_luma_edit"}.freeze

    EVENT_COLUMNS = %w[
      id public_id author_email author_name author_phone_number company_name company_website
      company_logo_url title description commune latitude longitude format capacity
      luma_event_api_id luma_event_url luma_event_created_at custom_url submitted_at approved_at
      rejected_at rejection_reason waiting_luma_edit_at published_at deleted_at logo_shown_at
      created_at updated_at
    ].freeze
    COHOST_COLUMNS = %w[
      id event_id company_name company_logo_url primary_contact_name primary_contact_email
      primary_contact_phone_number primary_contact_website primary_contact_linkedin
      logo_shown_at created_at updated_at
    ].freeze

    Counts = Data.define(:themes, :audiences, :events, :event_themes, :event_audiences, :cohosts)

    def initialize(source)
      @source = source
    end

    def run
      ActiveRecord::Base.transaction do
        Counts.new(
          themes: upsert(Theme, @source.themes.map { |row| tag(row) }),
          audiences: upsert(Audience, @source.audiences.map { |row| tag(row) }),
          events: upsert(Event, @source.events.map { |row| event(row) }),
          event_themes: upsert(EventTheme, links(@source.event_themes, "theme_id")),
          event_audiences: upsert(EventAudience, links(@source.event_audiences, "audience_id")),
          cohosts: upsert(Cohost, @source.cohosts.map { |row| row.slice(*COHOST_COLUMNS) })
        )
      end
    end

    private

    def upsert(model, rows)
      return 0 if rows.empty?

      model.upsert_all(rows, record_timestamps: false)
      rows.size
    end

    # EventThemes / EventAudiences: name + slug, created_at only.
    def tag(row)
      row.slice("id", "name", "slug", "created_at").merge("updated_at" => row["created_at"])
    end

    def event(row)
      attributes = row.slice(*EVENT_COLUMNS).merge(
        "edition" => EDITION,
        "starts_at" => row["start_date"],
        "ends_at" => row["end_date"],
        "state" => STATES.fetch(row["state"], row["state"])
      )
      Event.new(attributes).validate!
      attributes
    end

    # The join rows keep their ids; a pair linked twice on the old site is linked once here.
    def links(rows, tag_column)
      rows.uniq { |row| [row["event_id"], row[tag_column]] }.map do |row|
        row.slice("id", "event_id", tag_column, "created_at").merge("updated_at" => row["created_at"])
      end
    end
  end
end
