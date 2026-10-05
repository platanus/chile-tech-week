# The organisers' heads-up in their WhatsApp group when a submission arrives: the company's
# logo with the event's summary and the admin link as its caption. Off unless WPP_API_KEY and
# WPP_CHAT_JID are set. Runs inside WhatsappNotificationJob, so a failure raises (and retries)
# there instead of in the request that saved the event.
module WhatsappNotifier
  module_function

  def new_submission(event, config: AppConfig.instance)
    return false unless config.whatsapp?

    WppClient.new(api_url: config.wpp_api_url, api_key: config.wpp_api_key).send_message(
      to: config.wpp_chat_jid, text: submission_text(event, config), file: logo_file(event, config),
      idempotency_key: "techweek-submitted-#{event.id}"
    )
  end

  def submission_text(event, config = AppConfig.instance)
    admin_url = Rails.application.routes.url_helpers.admin_event_url(event.week, event, host: config.site_url)
    cohosts = event.cohosts.map(&:company_name).presence&.join(", ") || "ninguno"
    place = [event.address, event.commune].compact_blank.uniq.join(", ")
    <<~TEXT.strip
      🎉 *NUEVO EVENTO ENVIADO*

      *#{event.title}*
      Organiza: #{event.author_name} (#{event.company_name})
      Co-hosts: #{cohosts}
      Formato: #{event.format_label(:es)}
      Cuándo: #{when_label(event)}
      Dónde: #{place}
      Capacidad: #{event.capacity}

      Revisar: #{admin_url}
    TEXT
  end

  # The uploaded logo, sent as bytes so wpp-server never has to reach back through Cloudflare.
  # WhatsApp shows PNG and JPEG inline; a WebP logo is converted to PNG first. Events from
  # before uploads (only a `company_logo_url`) send that URL instead.
  def logo_file(event, config)
    if event.logo.attached?
      bytes = event.logo.download
      filename = event.logo.filename.to_s
      if event.logo.content_type == "image/webp"
        bytes = Vips::Image.new_from_buffer(bytes, "").write_to_buffer(".png")
        filename = "#{File.basename(filename, ".*")}.png"
      end
      {data: Base64.strict_encode64(bytes), filename: filename, kind: "image"}
    elsif event.company_logo_url.present?
      url = URI.join(config.site_url, event.company_logo_url).to_s
      {url: url, kind: "image"} if url.start_with?("https://")
    end
  end

  # "sábado 21 de noviembre, 20:00 – 23:00", or both dates when it runs past midnight.
  def when_label(event)
    starts, ends = [event.starts_at, event.ends_at].map { it.in_time_zone(Week::TIME_ZONE) }
    finish = (starts.to_date == ends.to_date) ? ends.strftime("%H:%M") : long_date(ends)
    "#{long_date(starts)} – #{finish}"
  end

  def long_date(time)
    local = time.in_time_zone(Week::TIME_ZONE)
    "#{I18n.t("date.day_names", locale: :es)[local.wday]} #{local.day} de #{I18n.t("date.month_names", locale: :es)[local.month]}, #{local.strftime("%H:%M")}"
  end
end
