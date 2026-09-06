# The Luma public API (https://public-api.luma.com/v1): the site creates a private Luma event
# for every approved submission, invites the hosts to edit it, makes it public when the host
# publishes, and mirrors the host's edits back (Luma::Sync). Without LUMA_API_KEY every call
# goes to Luma::FakeClient, so the whole flow runs locally.
module Luma
  class Error < StandardError; end

  # Luma answers 404 with "canceled" in the body once a host cancels an event.
  class NotFound < Error
    def canceled?
      message.include?("canceled") || message.include?("cancelled")
    end
  end

  # One Luma event, as the API returns it. `cover_url` is the artwork the host uploads while
  # editing on Luma (an images.lumacdn.com link) — what the programme shows for the event.
  # Everything but the id is optional: the fake client and the specs build partial events.
  Event = Data.define(:api_id, :name, :start_at, :end_at, :url, :visibility, :cover_url) do
    def initialize(api_id:, name: nil, start_at: nil, end_at: nil, url: nil, visibility: nil, cover_url: nil)
      super
    end

    def self.from_api(hash)
      new(api_id: hash["api_id"], name: hash["name"], start_at: hash["start_at"], end_at: hash["end_at"],
        url: hash["url"], visibility: hash["visibility"], cover_url: hash["cover_url"])
    end
  end

  def self.client
    config = AppConfig.instance
    config.luma? ? Client.new(config.luma_api_key) : FakeClient.instance
  end
end
