class AddSlugToEvents < ActiveRecord::Migration[8.1]
  disable_ddl_transaction!

  class MigrationEvent < ActiveRecord::Base
    self.table_name = "events"
  end

  def up
    add_column :events, :slug, :string
    add_index :events, :slug, unique: true, algorithm: :concurrently

    # Backfill existing editions too, without model callbacks or outbound notifications.
    MigrationEvent.reset_column_information
    reserved = %w[events admin brand luma luma-cover opengraph up rails assets flock
      cable vite-dev vite-test vite favicon robots sitemap 25]
    MigrationEvent.order(:created_at, :id).each do |event|
      base = event.title.to_s.parameterize.truncate(100, omission: "").sub(/-+\z/, "").presence || "evento"
      candidate = base
      suffix = 1
      while reserved.include?(candidate) || MigrationEvent.exists?(slug: candidate)
        suffix += 1
        candidate = "#{base}-#{suffix}"
      end
      event.update_columns(slug: candidate)
    end
  end

  def down
    remove_index :events, :slug, algorithm: :concurrently
    remove_column :events, :slug
  end
end
