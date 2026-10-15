class AddLumaVisibilityToEvents < ActiveRecord::Migration[8.1]
  def change
    add_column :events, :luma_visibility, :string
  end
end
