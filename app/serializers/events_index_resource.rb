# /events: the programme of the current edition and the week's days for the day tabs.
class EventsIndexResource < ApplicationResource
  typelize title: :string, description: :string
  attributes :title, :description

  has_many :events, resource: EventResource
  has_many :days, resource: DayResource
end
