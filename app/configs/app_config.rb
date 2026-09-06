# Typed config (anyway_config). Reads bare ENV names (SITE_URL, MISSION_CONTROL_USER, …) with
# dev/test-safe defaults; production overrides via the server .env, development via .env.local
# (loaded in config/application.rb). Add new settings here, not `ENV[...]` scattered around.
class AppConfig < Anyway::Config
  config_name :app
  env_prefix "" # map attr `site_url` -> ENV["SITE_URL"]

  attr_config(
    site_url: "https://techweek.cl",
    production_hostname: "techweek.cl",
    # HTTP basic auth for Mission Control (/admin/jobs); the mount is skipped when unset.
    mission_control_user: "",
    mission_control_password: "",

    # Luma (https://public-api.luma.com). Without a key the app talks to Luma::FakeClient, so
    # the approve → edit → publish flow works locally; production must set LUMA_API_KEY.
    luma_api_key: "",
    # The cover every generated Luma event starts with; the host replaces it.
    luma_cover_url: "",
    # Development only: co-host emails Luma is allowed to invite (comma-separated), so a local
    # run never mails a real submitter. Empty means invite nobody.
    luma_allowed_cohost_dev: "",
    # The public Luma calendar every published event ends up in.
    luma_calendar_url: "https://lu.ma/cltw",

    # Mail goes out through Resend's HTTP API (OutboundEmail::Delivery). SEND_EMAILS=false keeps
    # the outbound log but sends nothing — the default outside production.
    resend_api_key: "",
    send_emails: false,
    email_from: "Chile Tech Week <hola@techweek.cl>",
    email_reply_to: "hola@techweek.cl",
    # Outside production every message is redirected here instead of its real recipient.
    email_catch_all: "",
    contact_email: "hola@techweek.cl",

    # New submissions are announced in Slack when a bot token and a channel are set.
    slack_bot_token: "",
    slack_channel: ""
  )

  coerce_types send_emails: :boolean

  # One instance for the process (`AppConfig.instance.site_url`); specs that need a different
  # value stub it: `allow(AppConfig).to receive(:instance).and_return(AppConfig.new(...))`.
  def self.instance
    @instance ||= new
  end

  def mission_control?
    mission_control_user.present? && mission_control_password.present?
  end

  def luma?
    luma_api_key.present?
  end

  def slack?
    slack_bot_token.present? && slack_channel.present?
  end

  # anyway_config already splits a comma-separated ENV value into an array.
  def luma_allowed_cohost_emails
    Array(luma_allowed_cohost_dev).flat_map { |value| value.to_s.split(",") }.map(&:strip).reject(&:empty?)
  end
end
