# A company co-hosting an event alongside the one that submitted it.
class Cohost < ApplicationRecord
  belongs_to :event

  validates :company_name, :primary_contact_name, :primary_contact_email, presence: true

  scope :logo_shown, -> { where.not(logo_shown_at: nil) }
end
