module Edition2025
  # /25/events — the whole 2025 programme, filtered client-side (day, topic, time, type,
  # search) exactly as the old site did: one page, no pagination.
  class EventsController < BaseController
    def index
      @events = Event.for_edition(EDITION).published.chronological.includes(:themes, :audiences, :cohosts)
    end
  end
end
