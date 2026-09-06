# The team's heads-up in Slack when a submission arrives. Off unless SLACK_BOT_TOKEN and
# SLACK_CHANNEL are set; never raises into the request that triggered it.
module SlackNotifier
  module_function

  def new_submission(event)
    cohosts = event.cohosts.map(&:company_name).presence&.join(", ") || "ninguno"
    admin_url = Rails.application.routes.url_helpers.admin_event_url(event, host: AppConfig.instance.site_url)
    post(<<~TEXT)
      🎉 *NUEVO EVENTO ENVIADO*

      *#{event.title}*
      Organiza: #{event.author_name} (#{event.company_name})
      Co-hosts: #{cohosts}

      #{admin_url}
    TEXT
  end

  def post(text, config: AppConfig.instance)
    return false unless config.slack?

    SlackClient.new(config.slack_bot_token).post_message(channel: config.slack_channel, text: text)
  rescue SlackClient::Error => e
    Rails.logger.warn("Slack notification failed: #{e.message}")
    false
  end
end
