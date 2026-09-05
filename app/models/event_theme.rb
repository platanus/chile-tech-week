class EventTheme < ApplicationRecord
  belongs_to :event
  belongs_to :theme

  validates :theme_id, uniqueness: {scope: :event_id}
end
