# The language the host submitted in (/events/new or /en/events/new): their mail and the
# links in it follow it.
class AddLocaleToEvents < ActiveRecord::Migration[8.1]
  def change
    add_column :events, :locale, :string, null: false, default: "es"
  end
end
