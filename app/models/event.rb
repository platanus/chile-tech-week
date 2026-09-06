# An event of one Chile Tech Week edition, as submitted by its host company. The columns
# mirror the 2025 site's "Events" table (see db/migrate/*_create_events.rb); `edition` is the
# year, so the 2025 archive and the editions to come share the table.
class Event < ApplicationRecord
  FORMATS = %w[
    breakfast_brunch_lunch dinner experiential hackathon happy_hour matchmaking networking
    panel_fireside_chat pitch_event_demo_day roundtable_workshop
  ].freeze

  # The 2025 review workflow: submitted → rejected, or approved (waiting for the host to edit
  # the Luma event the site created) → published. Deleted is the host's own withdrawal.
  STATES = %w[submitted rejected waiting_luma_edit published deleted].freeze

  # An international number: "+56 9 8765 4321", spaces and dashes allowed.
  PHONE_FORMAT = /\A\+[1-9][\d\s-]{6,20}\z/
  HTTPS_URL = %r{\Ahttps://[^\s/$.?#].[^\s]*\z}i
  DESCRIPTION_LIMIT = 300
  CAPACITY_LIMIT = 500_000

  has_many :cohosts, dependent: :destroy, index_errors: true
  accepts_nested_attributes_for :cohosts, allow_destroy: true

  has_one_attached :logo
  # The Luma cover, mirrored by MirrorLumaCoverJob so the programme does not hotlink Luma's CDN.
  has_one_attached :cover
  has_many :event_themes, dependent: :destroy
  has_many :themes, through: :event_themes
  has_many :event_audiences, dependent: :destroy
  has_many :audiences, through: :event_audiences

  enum :format, FORMATS.index_by(&:itself), validate: true
  enum :state, STATES.index_by(&:itself), validate: true

  validates :edition, presence: true, numericality: {only_integer: true, greater_than_or_equal_to: 2025}
  validates :author_email, :author_name, :author_phone_number, :company_name, :company_website,
    :company_logo_url, :title, :description, :starts_at, :ends_at, :commune, presence: true
  validates :capacity, numericality: {only_integer: true, greater_than: 0}
  validate :ends_after_it_starts

  # What the submission form enforces on top (Events::Submit saves with `context: :submission`).
  with_options on: :submission do
    validates :title, length: {maximum: 500}
    validates :description, length: {maximum: DESCRIPTION_LIMIT}
    validates :author_email, format: {with: URI::MailTo::EMAIL_REGEXP}
    validates :author_phone_number, format: {with: PHONE_FORMAT}
    validates :company_website, format: {with: HTTPS_URL, message: :https_url}
    validates :capacity, numericality: {less_than_or_equal_to: CAPACITY_LIMIT}
    validates :commune, inclusion: {in: ->(_) { Communes::ALL }}
    validate :within_the_week
    validate :logo_uploaded
    validates :themes, :audiences, presence: true
  end

  normalizes :author_email, with: ->(email) { email.strip.downcase }
  normalizes :author_name, with: ->(name) { name.strip.squeeze(" ") }
  normalizes :title, :company_name, :commune, with: ->(value) { value.strip }
  normalizes :author_phone_number, :company_website, with: ->(value) { value.strip }

  scope :for_edition, ->(year) { where(edition: year) }
  scope :chronological, -> { order(:starts_at, :ends_at, :title) }
  # Companies that agreed to appear in the landing's "participating companies" wall.
  scope :logo_shown, -> { where.not(logo_shown_at: nil) }

  # Where attendees register: the host's own page when they gave one, else the Luma event.
  def registration_url
    custom_url.presence || luma_event_url.presence
  end

  # An uploaded image (the form's file field) becomes the company logo: stored with Active
  # Storage, and its permanent URL kept in company_logo_url like the 2025 archive's.
  def logo_upload=(file)
    return if file.blank?

    blob = ActiveStorage::Blob.create_and_upload!(io: file, filename: file.original_filename, content_type: file.content_type)
    logo.attach(blob)
    self.company_logo_url = Rails.application.routes.url_helpers.rails_blob_path(blob, only_path: true)
  end

  # The picture of the event: our copy of the cover the host set on Luma, falling back to
  # Luma's own URL while the mirror job has not run (or could not fetch it). Nil until the
  # event has a Luma event of its own.
  def cover_image_url
    return Rails.application.routes.url_helpers.rails_blob_path(cover, only_path: true) if cover.attached?

    luma_cover_url.presence
  end

  # The host's progress through the review: 1 submitted, 2 approved, 3 editing the Luma event,
  # 4 published. Rejected and deleted events sit at 1.
  def step
    case state
    when "submitted" then approved_at ? 2 : 1
    when "waiting_luma_edit" then 3
    when "published" then 4
    else 1
    end
  end

  # Everyone Luma should let edit the event: the submitter and each co-host's contact.
  def host_emails
    [author_email, *cohosts.map(&:primary_contact_email)].compact_blank.uniq
  end

  private

  def within_the_week
    errors.add(:starts_at, :outside_the_week, week: Edition.dates_label) if starts_at.present? && !Edition.within_window?(starts_at)
    errors.add(:ends_at, :outside_the_week, week: Edition.dates_label) if ends_at.present? && !Edition.within_window?(ends_at)
  end

  def logo_uploaded
    errors.add(:logo, :blank) if company_logo_url.blank?
  end

  def ends_after_it_starts
    return if starts_at.blank? || ends_at.blank? || ends_at > starts_at

    errors.add(:ends_at, "must be after the start")
  end
end
