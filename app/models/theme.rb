# A topic events are tagged with (AI, Fintech, SaaS, …).
class Theme < ApplicationRecord
  has_many :event_themes, dependent: :destroy
  has_many :events, through: :event_themes

  validates :name, :slug, presence: true, uniqueness: true
end
