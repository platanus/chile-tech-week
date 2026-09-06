# The editions themselves, so every event points at one and the panel can work on a single
# week at a time (/admin/25, /admin/26). The year is a Tech Week's identity — it is what the
# URLs, the copy and the mail already say — so it is the primary key and the `edition` column
# events have always carried becomes the foreign key: nothing to backfill, nothing renamed.
class CreateWeeks < ActiveRecord::Migration[8.1]
  def up
    create_table :weeks, id: :integer, primary_key: :year, default: nil do |t|
      t.date :starts_on, null: false
      t.date :ends_on, null: false
      t.timestamps
    end

    # The weeks the site knows (Week::KNOWN, written again by db/seeds.rb): they have to
    # exist before the events already pointing at them can be constrained. Two inserts into
    # the table this migration just created — nothing for strong_migrations to worry about.
    safety_assured do
      execute(<<~SQL)
        INSERT INTO weeks (year, starts_on, ends_on, created_at, updated_at) VALUES
          (2025, '2025-11-17', '2025-11-23', now(), now()),
          (2026, '2026-11-16', '2026-11-22', now(), now())
        ON CONFLICT (year) DO NOTHING
      SQL
    end

    # Unvalidated here and validated by the next migration, outside this DDL transaction:
    # that is the two-step strong_migrations asks for.
    add_foreign_key :events, :weeks, column: :edition, primary_key: :year, validate: false
  end

  def down
    remove_foreign_key :events, :weeks
    drop_table :weeks
  end
end
