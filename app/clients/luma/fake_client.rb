module Luma
  # What stands in for Luma when no API key is configured (development, test): events live in
  # memory, get an api id and a luma.com-looking URL, and can be cancelled (`cancel`) to
  # exercise Luma::Sync. One instance per process.
  class FakeClient
    include Singleton

    attr_reader :events, :hosts, :calendar

    def initialize
      reset!
    end

    def reset!
      @events = {}
      @hosts = Hash.new { |hash, key| hash[key] = [] }
      @cancelled = Set.new
      @paid = Set.new
      @calendar = []
    end

    def get_self
      {"api_id" => "usr-fake", "name" => "Chile Tech Week", "email" => "hola@techweek.cl"}
    end

    def get_event(api_id)
      raise NotFound, "Luma API error (404) on /event/get: event #{api_id} was canceled" if @cancelled.include?(api_id)

      @events.fetch(api_id) { raise NotFound, "Luma API error (404) on /event/get: event #{api_id} not found" }
    end

    # The read-only route answers like get_event (a cancelled event is a 404 too).
    def get_event_readonly(api_id)
      get_event(api_id)
    end

    def lookup_event_id(url)
      slug = url.to_s.split("/").last
      @events.values.find { |event| event.url.to_s.end_with?("/#{slug}") }&.api_id
    end

    def add_to_calendar(api_id)
      get_event(api_id)
      @calendar << api_id
      "calev-#{api_id}"
    end

    def remove_from_calendar(calendar_event_id)
      @calendar.delete(calendar_event_id.to_s.delete_prefix("calev-"))
      {}
    end

    def upload_image(body:, content_type:)
      "https://images.lumacdn.com/fake/#{Digest::SHA256.hexdigest(body)}.#{(content_type == "image/png") ? "png" : "jpg"}"
    end

    def create_event(attributes)
      api_id = "evt-fake-#{SecureRandom.hex(4)}"
      event = Event.new(api_id: api_id, name: attributes[:name], start_at: attributes[:start_at], end_at: attributes[:end_at],
        url: "https://luma.com/fake-#{SecureRandom.alphanumeric(8).downcase}", visibility: attributes.fetch(:visibility, "private"),
        cover_url: attributes[:cover_url].presence || "https://images.lumacdn.com/fake/#{api_id}-cover.png",
        description_md: attributes[:description_md])
      @events[api_id] = event
      Rails.logger.info("Luma::FakeClient created #{api_id} (#{event.url})")
      event
    end

    def update_event(api_id, attributes)
      event = get_event(api_id)
      # `cover_url` too: a host swapping the artwork on Luma is what Luma::Sync mirrors.
      @events[api_id] = event.with(**attributes.slice(:name, :start_at, :end_at, :visibility, :url, :cover_url, :description_md))
      {"event_api_id" => api_id}
    end

    def add_host(api_id, email)
      get_event(api_id)
      @hosts[api_id] << email
      {"success" => true}
    end

    def cancel_event(api_id)
      get_event(api_id)
      raise PaidEvent, "El evento tiene invitados que pagaron: cancélalo directamente en Luma." if @paid.include?(api_id)

      @cancelled << api_id
      {guest_count: 0}
    end

    # Test helper: the event has paid guests, so cancel_event refuses it.
    def mark_paid(api_id)
      @paid << api_id
    end

    # Test helper: make Luma answer like the host cancelled the event.
    def cancel(api_id)
      @cancelled << api_id
    end
  end
end
