# Why an admin took an event down (Events::TakeDown); empty when the host cancelled it on Luma.
class AddDeletionReasonToEvents < ActiveRecord::Migration[8.1]
  def change
    add_column :events, :deletion_reason, :text
  end
end
