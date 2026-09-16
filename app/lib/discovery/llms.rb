module Discovery
  # /llms.txt (https://llmstxt.org): what the site is, in a form an agent reads in one go —
  # the H1, a summary, the key facts, then link lists to the programme, every event's
  # Markdown document and the rest of the site. `full: true` is /llms-full.txt: the same,
  # followed by the whole programme and every event document, one file for everything.
  class Llms
    include Rails.application.routes.url_helpers

    FAQ = JSON.parse(Rails.root.join("config/faq.json").read).freeze

    def initialize(week, full: false)
      @week = week
      @full = full
      @events = week.events.published.chronological.includes(:themes, :audiences, :cohosts).to_a
    end

    def render
      lines = ["# #{SITE_NAME} #{@week.year}", "", "> #{summary}", ""]
      lines.concat(facts.map { |label, value| "- **#{label}:** #{value}" })
      lines << ""
      FAQ.each { |entry| lines.push("**#{entry["question"]}** #{entry["answer"]}", "") }
      lines.concat(programme_section, site_section, optional_section)
      lines.concat(full_section) if @full
      lines.join("\n").strip + "\n"
    end

    private

    def summary
      "#{TAGLINE} Del #{@week.dates_label} de #{@week.year}, en todo Chile: cada empresa organiza " \
        "su propio evento y este sitio reúne el programa completo, con la inscripción de cada uno."
    end

    def facts
      [
        ["Fechas", "#{@week.dates_label} de #{@week.year} (#{@week.starts_on.iso8601} a #{@week.ends_on.iso8601})"],
        ["Lugar", "Chile, principalmente Santiago; cada evento indica su comuna"],
        ["Eventos publicados", @events.size.to_s],
        ["Sitio", Discovery.url],
        ["Contacto", AppConfig.instance.contact_email],
        ["Calendario en Luma", AppConfig.instance.luma_calendar_url]
      ]
    end

    def programme_section
      lines = ["## Programa", "", "- [Programa completo](#{Discovery.url(events_path(format: :md))}): los #{@events.size} eventos publicados, por día."]
      lines.concat(@events.map { |event| EventDocument.new(event).summary_line })
      lines << ""
    end

    def site_section
      [
        "## Sitio", "",
        "- [Organiza un evento](#{Discovery.url(new_event_path)}): el formulario para inscribir un evento en el programa de #{@week.year}.",
        "- [Edición 2025](#{Discovery.url(edition2025_events_path)}): el programa del año pasado, tal como se realizó.",
        "- [Calendario en Luma](#{AppConfig.instance.luma_calendar_url}): los mismos eventos, para inscribirse.",
        ""
      ]
    end

    def optional_section
      [
        "## Optional", "",
        "- [Todo el contenido en un archivo](#{Discovery.url("/llms-full.txt")}): este documento más el programa y cada evento completos.",
        "- [Marca](#{Discovery.url(brand_path)}): logos y colores de #{SITE_NAME} #{@week.year}.",
        ""
      ]
    end

    def full_section
      lines = ["---", "", Programme.new(@week, @events).render]
      @events.each { |event| lines.push("---", "", EventDocument.new(event).render) }
      lines
    end
  end
end
