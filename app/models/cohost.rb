# A company co-hosting an event alongside the one that submitted it.
class Cohost < ApplicationRecord
  belongs_to :event

  has_one_attached :logo

  validates :company_name, :primary_contact_name, :primary_contact_email, presence: true

  # The submission form's rules (Event validates its cohosts in the same context).
  with_options on: :submission do
    validates :company_name, length: {maximum: 255}
    validates :primary_contact_email, format: {with: URI::MailTo::EMAIL_REGEXP}
    validates :primary_contact_phone_number, format: {with: Event::PHONE_FORMAT}, allow_blank: true
    validates :primary_contact_website, format: {with: Event::HTTPS_URL, message: :https_url}, allow_blank: true
    validates :primary_contact_linkedin, format: {with: Event::HTTPS_URL, message: :https_url}, allow_blank: true
    validates :company_logo_url, presence: true
  end

  normalizes :primary_contact_email, with: ->(email) { email.strip.downcase }
  normalizes :primary_contact_phone_number, :primary_contact_website, :primary_contact_linkedin, with: ->(value) { value.strip.presence }

  scope :logo_shown, -> { where.not(logo_shown_at: nil) }

  # An uploaded image becomes the company logo (see Event#logo_upload=).
  def logo_upload=(file)
    return if file.blank?

    blob = ActiveStorage::Blob.create_and_upload!(io: file, filename: file.original_filename, content_type: file.content_type)
    logo.attach(blob)
    self.company_logo_url = Rails.application.routes.url_helpers.rails_blob_path(blob, only_path: true)
  end
end
