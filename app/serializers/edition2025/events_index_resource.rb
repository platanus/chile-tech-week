module Edition2025
  class EventsIndexResource < PageResource
    has_many :events, resource: EventResource
  end
end
