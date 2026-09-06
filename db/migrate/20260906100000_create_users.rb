class CreateUsers < ActiveRecord::Migration[8.1]
  def change
    create_table :users, id: :uuid do |t|
      # Devise :database_authenticatable and :rememberable
      t.string :email, null: false, default: ""
      t.string :encrypted_password, null: false, default: ""
      t.datetime :remember_created_at
      t.string :first_name, null: false
      t.string :last_name, null: false
      t.string :role, null: false, default: "default"
      t.timestamptz :notifications_enabled_at
      t.timestamps
    end
    add_index :users, :email, unique: true
  end
end
