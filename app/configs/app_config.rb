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
    # Default PNG/JPEG cover: an HTTPS source uploaded to Luma, or an existing Luma CDN URL.
    luma_cover_url: "",
    # Development only: co-host emails Luma is allowed to invite (comma-separated), so a local
    # run never mails a real submitter. Empty means invite nobody.
    luma_allowed_cohost_dev: "",
    # The passkey of the site's Luma account (base64 of its exported JSON, see Luma::Passkey): how
    # Luma::Internal signs in to Luma's web API. Empty = the in-memory fake.
    luma_passkey: "",
    # The Luma account a host must add to an event they created on Luma before the site takes it
    # (Luma::Import): its user id (`usr-…`, checked against the event's hosts) and the email the
    # host sees in the instructions. An empty id skips the check (development, the fake client).
    luma_host_user_id: "",
    luma_host_email: "events@techweek.cl",
    # The public Luma calendar every published event ends up in.
    luma_calendar_url: "https://lu.ma/cltw",

    # Mail goes out through SMTP (Mailgun by default). SEND_EMAILS=false keeps
    # the outbound log but sends nothing — the default outside production.
    smtp_host: "smtp.mailgun.org",
    smtp_port: 587,
    smtp_user: "",
    smtp_password: "",
    send_emails: false,
    email_from: "Chile Tech Week 2026 <events@techweek.cl>",
    email_reply_to: "hello@techweek.cl",
    # Outside production every message is redirected here instead of its real recipient.
    email_catch_all: "",
    contact_email: "hola@techweek.cl",

    # New submissions are announced in Slack when a bot token and a channel are set.
    slack_bot_token: "",
    slack_channel: "",

    # The key the Cloudflare Email Worker (workers/inbound-email) sends with each message it posts
    # to /internal/inbound_emails. Empty = the endpoint is closed.
    inbound_email_key: "",

    # …and in the organisers' WhatsApp group, through wpp-server (wpp.rafafdz.dev): an API key
    # with the `send` scope and the group's JID ("1203…@g.us"). Either one empty = off.
    wpp_api_url: "https://wpp.rafafdz.dev",
    wpp_api_key: "",
    wpp_chat_jid: ""
  )

  coerce_types send_emails: :boolean, smtp_port: :integer

  # One instance for the process (`AppConfig.instance.site_url`); specs that need a different
  # value stub it: `allow(AppConfig).to receive(:instance).and_return(AppConfig.new(...))`.
  def self.instance
    @instance ||= new
  end

  def smtp_settings
    {
      address: smtp_host.presence,
      port: smtp_port,
      user_name: smtp_user.presence,
      password: smtp_password.presence,
      authentication: :plain,
      enable_starttls: true,
      open_timeout: 5,
      read_timeout: 20
    }
  end

  def mission_control?
    mission_control_user.present? && mission_control_password.present?
  end

  def luma?
    luma_api_key.present?
  end

  def luma_passkey?
    luma_passkey.present?
  end

  def slack?
    slack_bot_token.present? && slack_channel.present?
  end

  def whatsapp?
    wpp_api_key.present? && wpp_chat_jid.present?
  end

  # anyway_config already splits a comma-separated ENV value into an array.
  def luma_allowed_cohost_emails
    Array(luma_allowed_cohost_dev).flat_map { |value| value.to_s.split(",") }.map(&:strip).reject(&:empty?)
  end
end
