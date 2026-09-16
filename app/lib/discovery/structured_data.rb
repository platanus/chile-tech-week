module Discovery
  # The schema.org graph in every page's <head> (JSON-LD, StructuredDataHelper): the
  # organization and the site on every page, a week as an Event, and each event with its
  # schedule, place, organizers and registration link — what search engines and assistants
  # read to answer "what's on during Chile Tech Week".
  class StructuredData
    include Rails.application.routes.url_helpers

    # The closest schema.org Event subtype for each of the site's formats.
    EVENT_TYPES = {
      "breakfast_brunch_lunch" => "FoodEvent", "dinner" => "FoodEvent", "experiential" => "SocialEvent",
      "hackathon" => "Hackathon", "happy_hour" => "SocialEvent", "matchmaking" => "BusinessEvent",
      "networking" => "SocialEvent", "panel_fireside_chat" => "BusinessEvent",
      "pitch_event_demo_day" => "BusinessEvent", "roundtable_workshop" => "EducationEvent"
    }.freeze

    class << self
      def organization_id
        Discovery.url("/#organization")
      end

      # The two nodes every page carries.
      def site
        [
          {
            "@type" => "Organization", "@id" => organization_id, "name" => SITE_NAME, "url" => Discovery.url,
            "logo" => Discovery.url("/icon.png"), "email" => AppConfig.instance.contact_email,
            "sameAs" => [AppConfig.instance.luma_calendar_url]
          },
          {
            "@type" => "WebSite", "@id" => Discovery.url("/#website"), "name" => SITE_NAME, "url" => Discovery.url,
            "inLanguage" => "es-CL", "publisher" => {"@id" => organization_id}
          }
        ]
      end

      # A Tech Week as an Event; with `events`, its programme as subEvent.
      def week(week, events: nil)
        node = {
          "@type" => "Event", "@id" => Discovery.url("/##{week.year}"), "name" => "#{SITE_NAME} #{week.year}",
          "description" => "#{TAGLINE} Del #{week.dates_label} de #{week.year}, en todo Chile. #{Discovery.english_summary(week)}",
          "url" => Discovery.url, "image" => Discovery.url(HomeController::OPENGRAPH_IMAGE),
          "startDate" => week.starts_on.iso8601, "endDate" => week.ends_on.iso8601, "inLanguage" => "es",
          "eventStatus" => "https://schema.org/EventScheduled",
          "eventAttendanceMode" => "https://schema.org/OfflineEventAttendanceMode",
          "location" => {"@type" => "Place", "name" => "Chile", "address" => {"@type" => "PostalAddress", "addressCountry" => "CL"}},
          "organizer" => {"@id" => organization_id}
        }
        node["subEvent"] = events.map { |event| new(event).node(with_parent: false) } if events
        node
      end

      def event(event)
        new(event).node
      end
    end

    def initialize(event)
      @event = event
    end

    def node(with_parent: true)
      url = Discovery.url(public_event_path(slug: @event.slug))
      node = {
        "@type" => EVENT_TYPES.fetch(@event.format, "Event"), "@id" => url, "name" => @event.title,
        "description" => @event.description, "url" => url,
        "startDate" => Discovery.local(@event.starts_at).iso8601, "endDate" => Discovery.local(@event.ends_at).iso8601,
        "inLanguage" => "es", "eventStatus" => "https://schema.org/EventScheduled",
        "eventAttendanceMode" => "https://schema.org/OfflineEventAttendanceMode",
        "location" => location, "organizer" => organizers, "image" => images,
        "maximumAttendeeCapacity" => @event.capacity,
        "keywords" => [@event.format_label, *@event.themes.map(&:name)].join(", "),
        "audience" => @event.audiences.map { |audience| {"@type" => "Audience", "audienceType" => audience.name} }
      }
      node["offers"] = {"@type" => "Offer", "url" => @event.registration_url, "availability" => "https://schema.org/InStock"} if @event.registration_url
      node["superEvent"] = self.class.week(@event.week).except("subEvent") if with_parent
      node.compact
    end

    private

    def location
      place = {
        "@type" => "Place", "name" => @event.commune,
        "address" => {"@type" => "PostalAddress", "addressLocality" => @event.commune, "addressCountry" => "CL"}
      }
      if @event.latitude && @event.longitude
        place["geo"] = {"@type" => "GeoCoordinates", "latitude" => @event.latitude.to_f, "longitude" => @event.longitude.to_f}
      end
      place
    end

    def organizers
      host = {"@type" => "Organization", "name" => @event.company_name, "url" => @event.company_website, "logo" => absolute(@event.company_logo_url)}
      cohosts = @event.cohosts.map { |cohost| {"@type" => "Organization", "name" => cohost.company_name, "logo" => absolute(cohost.company_logo_url)}.compact }
      [host, *cohosts]
    end

    # The cover the host set on Luma when there is one, then the share card either way.
    def images
      [absolute(@event.cover_image_url), Discovery.url(public_event_opengraph_path(slug: @event.slug))].compact
    end

    def absolute(url)
      return if url.blank?

      url.start_with?("/") ? Discovery.url(url) : url
    end
  end
end
