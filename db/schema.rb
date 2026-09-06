# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_09_06_180000) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "active_storage_attachments", force: :cascade do |t|
    t.bigint "blob_id", null: false
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.uuid "record_id", null: false
    t.string "record_type", null: false
    t.index ["blob_id"], name: "index_active_storage_attachments_on_blob_id"
    t.index ["record_type", "record_id", "name", "blob_id"], name: "index_active_storage_attachments_uniqueness", unique: true
  end

  create_table "active_storage_blobs", force: :cascade do |t|
    t.bigint "byte_size", null: false
    t.string "checksum"
    t.string "content_type"
    t.datetime "created_at", null: false
    t.string "filename", null: false
    t.string "key", null: false
    t.text "metadata"
    t.string "service_name", null: false
    t.index ["key"], name: "index_active_storage_blobs_on_key", unique: true
  end

  create_table "active_storage_variant_records", force: :cascade do |t|
    t.bigint "blob_id", null: false
    t.string "variation_digest", null: false
    t.index ["blob_id", "variation_digest"], name: "index_active_storage_variant_records_uniqueness", unique: true
  end

  create_table "audiences", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.string "slug", null: false
    t.datetime "updated_at", null: false
    t.index ["name"], name: "index_audiences_on_name", unique: true
    t.index ["slug"], name: "index_audiences_on_slug", unique: true
  end

  create_table "cohosts", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "company_logo_url"
    t.string "company_name", null: false
    t.datetime "created_at", null: false
    t.uuid "event_id", null: false
    t.timestamptz "logo_shown_at"
    t.string "primary_contact_email", null: false
    t.string "primary_contact_linkedin"
    t.string "primary_contact_name", null: false
    t.string "primary_contact_phone_number"
    t.string "primary_contact_website"
    t.datetime "updated_at", null: false
    t.index ["event_id"], name: "index_cohosts_on_event_id"
  end

  create_table "event_audiences", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "audience_id", null: false
    t.datetime "created_at", null: false
    t.uuid "event_id", null: false
    t.datetime "updated_at", null: false
    t.index ["audience_id"], name: "index_event_audiences_on_audience_id"
    t.index ["event_id", "audience_id"], name: "index_event_audiences_on_event_id_and_audience_id", unique: true
    t.index ["event_id"], name: "index_event_audiences_on_event_id"
  end

  create_table "event_themes", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.uuid "event_id", null: false
    t.uuid "theme_id", null: false
    t.datetime "updated_at", null: false
    t.index ["event_id", "theme_id"], name: "index_event_themes_on_event_id_and_theme_id", unique: true
    t.index ["event_id"], name: "index_event_themes_on_event_id"
    t.index ["theme_id"], name: "index_event_themes_on_theme_id"
  end

  create_table "events", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.timestamptz "approved_at"
    t.string "author_email", null: false
    t.string "author_name", null: false
    t.string "author_phone_number", null: false
    t.integer "capacity", default: 100, null: false
    t.string "commune", null: false
    t.string "company_logo_url", null: false
    t.string "company_name", null: false
    t.string "company_website", null: false
    t.datetime "created_at", null: false
    t.string "custom_url"
    t.timestamptz "deleted_at"
    t.text "description", null: false
    t.integer "edition", null: false
    t.timestamptz "ends_at", null: false
    t.string "format", null: false
    t.decimal "latitude", precision: 10, scale: 8
    t.timestamptz "logo_shown_at"
    t.decimal "longitude", precision: 11, scale: 8
    t.string "luma_cover_url"
    t.string "luma_event_api_id"
    t.timestamptz "luma_event_created_at"
    t.string "luma_event_url"
    t.uuid "public_id", default: -> { "gen_random_uuid()" }, null: false
    t.timestamptz "published_at"
    t.timestamptz "rejected_at"
    t.text "rejection_reason"
    t.timestamptz "starts_at", null: false
    t.string "state", default: "submitted", null: false
    t.timestamptz "submitted_at", default: -> { "now()" }, null: false
    t.string "title", null: false
    t.datetime "updated_at", null: false
    t.timestamptz "waiting_luma_edit_at"
    t.index ["edition", "starts_at"], name: "index_events_on_edition_and_starts_at"
    t.index ["edition", "state"], name: "index_events_on_edition_and_state"
    t.index ["public_id"], name: "index_events_on_public_id", unique: true
  end

  create_table "outbound_emails", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.jsonb "bcc"
    t.jsonb "cc"
    t.datetime "created_at", null: false
    t.string "external_message_id"
    t.text "failure_reason"
    t.text "html_content", null: false
    t.timestamptz "queued_at"
    t.timestamptz "sent_at"
    t.string "status", default: "queued", null: false
    t.string "subject", null: false
    t.jsonb "template_data"
    t.string "template_name", null: false
    t.text "text_content"
    t.string "to", null: false
    t.datetime "updated_at", null: false
    t.index ["created_at"], name: "index_outbound_emails_on_created_at"
    t.index ["status"], name: "index_outbound_emails_on_status"
  end

  create_table "players", force: :cascade do |t|
    t.string "codename", null: false
    t.string "color", null: false
    t.datetime "created_at", null: false
    t.datetime "last_seen_at"
    t.datetime "updated_at", null: false
    t.index ["codename"], name: "index_players_on_codename"
  end

  create_table "task_runs", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.integer "execution_count", default: 0, null: false
    t.text "last_error"
    t.timestamptz "last_executed_at"
    t.string "last_status"
    t.string "task_id", null: false
    t.datetime "updated_at", null: false
    t.index ["task_id"], name: "index_task_runs_on_task_id", unique: true
  end

  create_table "themes", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.string "slug", null: false
    t.datetime "updated_at", null: false
    t.index ["name"], name: "index_themes_on_name", unique: true
    t.index ["slug"], name: "index_themes_on_slug", unique: true
  end

  create_table "users", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "email", default: "", null: false
    t.string "encrypted_password", default: "", null: false
    t.string "first_name", null: false
    t.string "last_name", null: false
    t.timestamptz "notifications_enabled_at"
    t.datetime "remember_created_at"
    t.string "role", default: "default", null: false
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_users_on_email", unique: true
  end

  add_foreign_key "active_storage_attachments", "active_storage_blobs", column: "blob_id"
  add_foreign_key "active_storage_variant_records", "active_storage_blobs", column: "blob_id"
  add_foreign_key "cohosts", "events", on_delete: :cascade
  add_foreign_key "event_audiences", "audiences", on_delete: :cascade
  add_foreign_key "event_audiences", "events", on_delete: :cascade
  add_foreign_key "event_themes", "events", on_delete: :cascade
  add_foreign_key "event_themes", "themes", on_delete: :cascade
end
