# Who an event is for (Founders, Investors, Engineers, …): 2025's "EventAudiences" plus the
# "EventAudienceRelations" join table.
class CreateAudiences < ActiveRecord::Migration[8.1]
  def change
    create_table :audiences, id: :uuid do |t|
      t.string :name, null: false
      t.string :slug, null: false
      t.timestamps
    end
    add_index :audiences, :name, unique: true
    add_index :audiences, :slug, unique: true

    create_table :event_audiences, id: :uuid do |t|
      t.references :event, type: :uuid, null: false, foreign_key: {on_delete: :cascade}
      t.references :audience, type: :uuid, null: false, foreign_key: {on_delete: :cascade}
      t.timestamps
    end
    add_index :event_audiences, [:event_id, :audience_id], unique: true
  end
end
