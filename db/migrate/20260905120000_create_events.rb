# The events table, reproduced from the 2025 site (Drizzle "Events") with Rails conventions:
# uuid primary keys so the 2025 rows keep their identities on import, string-backed
# ActiveRecord enums instead of Postgres enum types, starts_at/ends_at instead of
# start_date/end_date. `edition` is the year the event belongs to — 2025's archive and the
# editions to come share one table.
class CreateEvents < ActiveRecord::Migration[8.1]
  def change
    create_table :events, id: :uuid do |t|
      t.integer :edition, null: false
      t.uuid :public_id, null: false, default: -> { "gen_random_uuid()" }

      # The submitter and the hosting company
      t.string :author_email, null: false
      t.string :author_name, null: false
      t.string :author_phone_number, null: false
      t.string :company_name, null: false
      t.string :company_website, null: false
      t.string :company_logo_url, null: false

      # The event itself
      t.string :title, null: false
      t.text :description, null: false
      t.timestamptz :starts_at, null: false
      t.timestamptz :ends_at, null: false
      t.string :commune, null: false
      t.decimal :latitude, precision: 10, scale: 8
      t.decimal :longitude, precision: 11, scale: 8
      t.string :format, null: false
      t.integer :capacity, null: false, default: 100

      # Where people register: the Luma event the site created, or the host's own page
      t.string :luma_event_api_id
      t.string :luma_event_url
      t.timestamptz :luma_event_created_at
      t.string :custom_url

      # Review workflow: submitted → (rejected | waiting_luma_edit → published) | deleted
      t.string :state, null: false, default: "submitted"
      t.timestamptz :submitted_at, null: false, default: -> { "now()" }
      t.timestamptz :approved_at
      t.timestamptz :rejected_at
      t.text :rejection_reason
      t.timestamptz :waiting_luma_edit_at
      t.timestamptz :published_at
      t.timestamptz :deleted_at

      # Set when the company agreed to show its logo on the landing
      t.timestamptz :logo_shown_at

      t.timestamps
    end

    add_index :events, :public_id, unique: true
    add_index :events, [:edition, :state]
    add_index :events, [:edition, :starts_at]
  end
end
