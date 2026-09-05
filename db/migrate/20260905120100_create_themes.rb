# Topics an event is tagged with (AI, Fintech, SaaS, …): 2025's "EventThemes" plus the
# "EventThemeRelations" join table.
class CreateThemes < ActiveRecord::Migration[8.1]
  def change
    create_table :themes, id: :uuid do |t|
      t.string :name, null: false
      t.string :slug, null: false
      t.timestamps
    end
    add_index :themes, :name, unique: true
    add_index :themes, :slug, unique: true

    create_table :event_themes, id: :uuid do |t|
      t.references :event, type: :uuid, null: false, foreign_key: {on_delete: :cascade}
      t.references :theme, type: :uuid, null: false, foreign_key: {on_delete: :cascade}
      t.timestamps
    end
    add_index :event_themes, [:event_id, :theme_id], unique: true
  end
end
