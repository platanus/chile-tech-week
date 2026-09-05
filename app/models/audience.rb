# Who an event is aimed at (Founders, Investors, Engineers, …).
class Audience < ApplicationRecord
  has_many :event_audiences, dependent: :destroy
  has_many :events, through: :event_audiences

  validates :name, :slug, presence: true, uniqueness: true
end
