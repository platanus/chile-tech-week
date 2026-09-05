# A condor pilot: the persisted half of a flock member. The live half (position, who sees whom)
# lives in Flock::World and never touches the database.
class Player < ApplicationRecord
  validates :codename, presence: true, length: {maximum: Flock::Codename::MAX_LENGTH},
    format: {with: Flock::Codename::FORMAT, message: "solo letras, números y guiones"}
  validates :color, inclusion: {in: Flock::Palette::COLORS}

  def self.with_fresh_codename(color: Flock::Palette.random)
    create!(codename: Flock::Codename.generate { |name| !exists?(codename: name) }, color:)
  end
end
