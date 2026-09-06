module Luma
  # Creates the Luma event of an approved submission: private, with the site's cover and the
  # editing checklist as description, then invites the hosts (the submitter and each co-host's
  # contact) as hosts so they can finish it. A failed invitation does not fail the approval.
  class EventCreator
    Result = Data.define(:api_id, :url, :invited, :failed)

    def initialize(event, client: Luma.client, config: AppConfig.instance)
      @event = event
      @client = client
      @config = config
    end

    def call
      created = @client.create_event(attributes)
      invited, failed = invite_hosts(created.api_id)
      Result.new(api_id: created.api_id, url: fetch_url(created), invited: invited, failed: failed)
    end

    def attributes
      {
        name: @event.title,
        start_at: @event.starts_at.utc.iso8601,
        end_at: @event.ends_at.utc.iso8601,
        timezone: Week::TIME_ZONE,
        description_md: Description.new(@event).to_md,
        cover_url: @config.luma_cover_url.presence,
        tint_color: "#ee2b2b",
        location: @event.commune,
        geo_address_json: {type: "manual", address: "#{@event.commune}, Chile"},
        visibility: "private",
        capacity: @event.capacity
      }
    end

    # The hosts Luma should invite. Outside production only the allow-listed addresses, so a
    # local run never mails a real submitter.
    def host_emails
      emails = @event.host_emails
      return emails if Rails.env.production?

      emails & @config.luma_allowed_cohost_emails
    end

    private

    def invite_hosts(api_id)
      invited = []
      failed = []
      host_emails.each do |email|
        @client.add_host(api_id, email)
        invited << email
      rescue Error => e
        Rails.logger.warn("Luma add-host failed for #{email} on #{api_id}: #{e.message}")
        failed << email
      end
      [invited, failed]
    end

    # /event/get is the source of truth once Luma has settled the slug; fall back to what
    # create answered.
    def fetch_url(created)
      @client.get_event(created.api_id).url.presence || created.url
    rescue Error => e
      Rails.logger.warn("Luma get-event after create failed for #{created.api_id}: #{e.message}")
      created.url
    end
  end
end
