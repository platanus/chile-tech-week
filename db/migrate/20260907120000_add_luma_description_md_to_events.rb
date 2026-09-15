class AddLumaDescriptionMdToEvents < ActiveRecord::Migration[8.1]
  def change
    # Full Luma body, separate from the submission's short description.
    add_column :events, :luma_description_md, :text
  end
end
