module Luma
  # The Markdown the generated Luma event starts with: the editing checklist the host must
  # work through, the description they submitted, the link back to publish, and the
  # organiser details for the team. The host replaces all of it.
  class Description
    def initialize(event)
      @event = event
    end

    def to_md
      [
        "## ⚠️ RECUERDA EDITAR ESTA DESCRIPCIÓN ⚠️",
        "",
        "### CHECKLIST DE EDICIÓN:",
        "- [ ] Verificar fecha y hora del evento",
        "- [ ] Agregar imágenes del evento",
        "- [ ] Verificar la dirección del evento",
        "- [ ] [Editar tu perfil de Luma](https://luma.com/settings) con el nombre y logo de tu empresa",
        "",
        "## DESCRIPCIÓN",
        @event.description.presence || "*Descripción pendiente*",
        "",
        "🚀 [Cuando completes los pasos, publica el evento aquí](#{status_url})",
        "",
        "---",
        "",
        "## INFORMACIÓN DE LA ORGANIZACIÓN",
        "",
        "**Organiza:** #{@event.author_name} (#{@event.author_email}) — #{@event.company_name}",
        "**Formato:** #{@event.format.humanize}",
        *cohosts,
        "",
        "**Contacto:** #{@event.author_phone_number}",
        "",
        "---",
        "*Este evento fue creado desde el formulario de Chile Tech Week #{@event.edition}.*",
        "",
        "⚠️ FIN DE LA DESCRIPCIÓN AUTOGENERADA — BORRA ESTA PARTE ⚠️"
      ].join("\n")
    end

    private

    def cohosts
      return [] if @event.cohosts.empty?

      ["", "**Co-hosts:**"] + @event.cohosts.each_with_index.map do |cohost, i|
        "#{i + 1}. **#{cohost.company_name}** — #{cohost.primary_contact_name} (#{cohost.primary_contact_email})"
      end
    end

    def status_url
      Rails.application.routes.url_helpers.event_url(@event, host: AppConfig.instance.site_url, publish: true)
    end
  end
end
