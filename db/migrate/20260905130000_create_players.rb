# One row per condor pilot, created the first time a visitor enters the game and identified by a
# signed cookie from then on. Codenames are unique among the players currently online (the
# in-memory Flock::World enforces that), not across the table.
class CreatePlayers < ActiveRecord::Migration[8.1]
  def change
    create_table :players do |t|
      t.string :codename, null: false
      t.string :color, null: false
      t.datetime :last_seen_at
      t.timestamps
    end
    add_index :players, :codename
  end
end
