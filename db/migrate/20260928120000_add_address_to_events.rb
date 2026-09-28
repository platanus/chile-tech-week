class AddAddressToEvents < ActiveRecord::Migration[8.1]
  def change
    add_column :events, :address, :string
  end
end
