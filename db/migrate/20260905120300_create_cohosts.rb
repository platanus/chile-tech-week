# Companies co-hosting an event alongside the submitting one (2025's "EventCohosts"), each
# with its own contact and, once agreed, its logo on the landing.
class CreateCohosts < ActiveRecord::Migration[8.1]
  def change
    create_table :cohosts, id: :uuid do |t|
      t.references :event, type: :uuid, null: false, foreign_key: {on_delete: :cascade}
      t.string :company_name, null: false
      t.string :company_logo_url
      t.string :primary_contact_name, null: false
      t.string :primary_contact_email, null: false
      t.string :primary_contact_phone_number
      t.string :primary_contact_website
      t.string :primary_contact_linkedin
      t.timestamptz :logo_shown_at
      t.timestamps
    end
  end
end
