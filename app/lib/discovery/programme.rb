module Discovery
  # The week's programme as Markdown (/events.md): every published event by day, one line
  # each, linking its own document.
  class Programme
    def initialize(week, events = week.events.published.chronological.includes(:cohosts))
      @week = week
      @events = events.to_a
    end

    def render
      lines = ["# Programa · #{SITE_NAME} #{@week.year}", "", "> #{summary}", ""]
      if @events.empty?
        lines << "Todavía no hay eventos publicados. Los eventos aparecen aquí a medida que sus organizadores los publican."
      end
      @events.group_by { |event| Discovery.local(event.starts_at).to_date }.each do |date, events|
        lines.push("## #{I18n.l(date, format: "%A %-d de %B").capitalize}", "")
        events.each { |event| lines << EventDocument.new(event).summary_line }
        lines << ""
      end
      lines.join("\n").strip + "\n"
    end

    def summary
      "#{(@events.size == 1) ? "1 evento publicado" : "#{@events.size} eventos publicados"} del #{@week.dates_label} de #{@week.year}, en todo Chile. " \
        "Cada uno lo organiza una empresa distinta y tiene su propia inscripción; cada enlace lleva a la versión Markdown del evento."
    end
  end
end
