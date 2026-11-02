class AddLumaGuestAccessToEvents < ActiveRecord::Migration[8.1]
  def change
    add_column :events, :luma_require_approval, :boolean, null: false, default: false
    add_column :events, :luma_location_visibility, :string
  end
end
