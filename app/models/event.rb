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

  has_many :cohosts, dependent: :destroy
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

  scope :for_edition, ->(year) { where(edition: year) }
  scope :chronological, -> { order(:starts_at, :ends_at, :title) }
  # Companies that agreed to appear in the landing's "participating companies" wall.
  scope :logo_shown, -> { where.not(logo_shown_at: nil) }

  # Where attendees register: the host's own page when they gave one, else the Luma event.
  def registration_url
    custom_url.presence || luma_event_url.presence
  end

  private

  def ends_after_it_starts
    return if starts_at.blank? || ends_at.blank? || ends_at > starts_at

    errors.add(:ends_at, "must be after the start")
  end
end
