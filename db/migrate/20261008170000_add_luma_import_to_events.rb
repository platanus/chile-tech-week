# An event the host created on Luma and handed to us (Luma::Import) rather than one the site
# created for them: `luma_imported_at` marks it, `luma_calendar_event_id` is its submission to
# the Tech Week calendar, kept so a take-down can remove it from there.
class AddLumaImportToEvents < ActiveRecord::Migration[8.1]
  def change
    add_column :events, :luma_imported_at, :timestamptz
    add_column :events, :luma_calendar_event_id, :string
  end
end
