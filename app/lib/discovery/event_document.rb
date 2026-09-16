module Discovery
  # One published event as Markdown: the facts as a list an agent can quote, then the host's
  # own description as they wrote it on Luma. Served at /<slug>.md and inlined in
  # /llms-full.txt.
  class EventDocument
    include Rails.application.routes.url_helpers

    def initialize(event)
      @event = event
    end

    def page_url
      Discovery.url(public_event_path(slug: @event.slug))
    end

    def document_url
      Discovery.url(public_event_path(slug: @event.slug, format: :md))
    end

    def render
      lines = ["# #{@event.title}", "", "> #{@event.description.squish}", ""]
      facts.each { |label, value| lines << "- **#{label}:** #{value}" }
      body = @event.luma_description_md.to_s.strip
      lines.push("", "## Descripción", "", body) if body.present?
      lines.join("\n") + "\n"
    end

    # "- [Title](…/slug.md): lun 16 nov, 17:00 · Providencia · Networking · Company" — the
    # event's line in the programme and in llms.txt.
    def summary_line
      "- [#{@event.title}](#{document_url}): #{[Discovery.short_label(@event.starts_at), @event.commune, @event.format_label, @event.company_name].join(" · ")}"
    end

    private

    def facts
      week = @event.week
      [
        ["Cuándo", Discovery.schedule_label(@event.starts_at, @event.ends_at)],
        ["Dónde", "#{@event.commune}, Chile"],
        ["Formato", @event.format_label],
        ["Organiza", organizers],
        ["Temas", @event.themes.map(&:name).join(", ").presence],
        ["Audiencia", @event.audiences.map(&:name).join(", ").presence],
        ["Capacidad", "#{@event.capacity} personas"],
        ["Inscripción", @event.registration_url],
        ["Página", page_url],
        ["Parte de", "[#{SITE_NAME} #{week.year}](#{Discovery.url}), #{week.dates_label} de #{week.year}"]
      ].select { |_label, value| value.present? }
    end

    def organizers
      [
        "[#{@event.company_name}](#{@event.company_website})",
        *@event.cohosts.map(&:company_name)
      ].join(", ")
    end
  end
end
