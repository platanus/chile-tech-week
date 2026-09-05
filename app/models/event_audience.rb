class EventAudience < ApplicationRecord
  belongs_to :event
  belongs_to :audience

  validates :audience_id, uniqueness: {scope: :event_id}
end
