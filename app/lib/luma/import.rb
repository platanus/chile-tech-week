module Luma
  # Reads the Luma event a host points the submission form at and says whether the site can take
  # it: it exists, is public and not cancelled, falls inside the week, is not registered yet, and
  # has the site's Luma account as one of its hosts (only a real host can add it, which is what
  # proves the event is theirs and gives the site the access it needs afterwards).
  class Import
    ERRORS = %i[invalid_link not_found cancelled private outside_week already_registered not_host unavailable].freeze

    # `event` is the Luma::Event when the import can go ahead, `error` one of ERRORS when not.
    Result = Data.define(:event, :error) do
      def ok?
        error.nil?
      end

      # The form's own param names, filled from the Luma event.
      def prefill
        {title: event.name, description: plain_description,
         starts_at: local(event.start_at), ends_at: local(event.end_at)}
      end

      private

      def local(time)
        Time.zone.parse(time.to_s).in_time_zone(Week::TIME_ZONE).strftime("%Y-%m-%dT%H:%M")
      end

      # The programme's short text: the Luma description without its Markdown, cut to the limit.
      def plain_description
        event.description_md.to_s
          .gsub(/!?\[([^\]]*)\]\([^)]*\)/, '\1').gsub(/^#+\s*/, "").gsub(/[*_`>]/, "").squish
          .truncate(::Event::DESCRIPTION_LIMIT, separator: " ")
      end
    end

    HOSTS = %w[luma.com www.luma.com lu.ma].freeze

    def initialize(url, week:, client: Luma.client, config: AppConfig.instance)
      @url = url.to_s.strip
      @week = week
      @client = client
      @config = config
    end

    def call
      link = normalized_link or return failure(:invalid_link)
      api_id = @client.lookup_event_id(link) or return failure(:not_found)
      remote = @client.get_event_readonly(api_id)

      return failure(:private) unless remote.visibility == "public"
      return failure(:outside_week) unless inside_week?(remote)
      return failure(:already_registered) if registered?(remote)
      return failure(:not_host) unless host?(remote)

      Result.new(event: remote, error: nil)
    rescue NotFound => e
      failure(e.gone? ? :cancelled : :not_found)
    rescue Error => e
      Rails.logger.error("Luma import failed for #{@url}: #{e.message}")
      failure(:unavailable)
    end

    private

    # "https://luma.com/abc", "luma.com/abc?tk=1", "lu.ma/abc" or the bare slug → one Luma URL.
    def normalized_link
      return "https://luma.com/#{@url}" if @url.match?(/\A[\w-]+\z/)

      uri = URI.parse(@url.match?(%r{\Ahttps?://}i) ? @url : "https://#{@url}")
      return unless HOSTS.include?(uri.host&.downcase) && uri.path.to_s.length > 1

      "https://luma.com#{uri.path}"
    rescue URI::InvalidURIError
      nil
    end

    def inside_week?(remote)
      [remote.start_at, remote.end_at].all? { |time| time.present? && @week.within_window?(Time.zone.parse(time)) }
    end

    def registered?(remote)
      ::Event.where(luma_event_api_id: remote.api_id).where.not(state: %w[rejected deleted]).exists?
    end

    def host?(remote)
      @config.luma_host_user_id.blank? || remote.host_ids.include?(@config.luma_host_user_id)
    end

    def failure(error)
      Result.new(event: nil, error: error)
    end
  end
end
