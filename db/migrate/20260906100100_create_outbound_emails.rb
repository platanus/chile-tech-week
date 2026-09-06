class CreateOutboundEmails < ActiveRecord::Migration[8.1]
  def change
    create_table :outbound_emails, id: :uuid do |t|
      t.string :template_name, null: false
      t.string :to, null: false
      t.jsonb :cc
      t.jsonb :bcc
      t.string :subject, null: false
      t.text :html_content, null: false
      t.text :text_content
      t.jsonb :template_data
      t.string :status, null: false, default: "queued"
      t.timestamptz :queued_at
      t.timestamptz :sent_at
      t.text :failure_reason
      t.string :external_message_id
      t.timestamps
    end
    add_index :outbound_emails, :status
    add_index :outbound_emails, :created_at
  end
end
