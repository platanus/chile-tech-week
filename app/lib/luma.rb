# The Luma public API (https://public-api.luma.com/v1): the site creates a private Luma event
# for every approved submission, invites the hosts to edit it, makes it public when the host
# publishes, and mirrors the host's edits back (Luma::Sync). Without LUMA_API_KEY every call
# goes to Luma::FakeClient, so the whole flow runs locally.
module Luma
  class Error < StandardError; end

  # Cancelling would refund paid guests, which is decided on Luma, not from a button here.
  class PaidEvent < Error; end

  # Luma answers 404 for an event that is no longer there. A cancellation by API leaves
  # "Sorry, we could not find what you were looking for." (checked against the live API,
  # 2026-10-08); an older shape carried "canceled" in the body.
  class NotFound < Error
    def canceled?
      message.include?("canceled") || message.include?("cancelled")
    end

    # The event is gone from Luma (cancelled or deleted), as opposed to a 404 on some other path.
    def gone?
      canceled? || message.include?("could not find")
    end
  end

  # One Luma event, as the API returns it. `cover_url` is the artwork the host uploads while
  # editing on Luma (an images.lumacdn.com link) — what the programme shows for the event.
  # Everything but the id is optional: the fake client and the specs build partial events.
  #
  # `/events/get` (the read-only route, which answers for any event) names the id `id` and also
  # lists the `hosts` ({"id", "name"}).
  Event = Data.define(:api_id, :name, :start_at, :end_at, :url, :visibility, :cover_url, :description_md, :hosts) do
    def initialize(api_id:, name: nil, start_at: nil, end_at: nil, url: nil, visibility: nil, cover_url: nil, description_md: nil, hosts: [])
      super
    end

    def self.from_api(hash)
      new(api_id: hash["api_id"] || hash["id"], name: hash["name"], start_at: hash["start_at"], end_at: hash["end_at"],
        url: hash["url"], visibility: hash["visibility"], cover_url: hash["cover_url"], description_md: hash["description_md"],
        hosts: Array(hash["hosts"]))
    end

    def host_ids
      hosts.filter_map { |host| host["id"] }
    end
  end

  def self.client
    config = AppConfig.instance
    config.luma? ? Client.new(config.luma_api_key) : FakeClient.instance
  end
end
