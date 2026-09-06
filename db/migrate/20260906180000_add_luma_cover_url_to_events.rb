class AddLumaCoverUrlToEvents < ActiveRecord::Migration[8.1]
  def change
    # The cover the host set on Luma (images.lumacdn.com). Luma::Sync stores it and
    # MirrorLumaCoverJob keeps a copy of the image itself in Active Storage.
    add_column :events, :luma_cover_url, :string
  end
end
