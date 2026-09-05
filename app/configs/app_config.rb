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
    mission_control_password: ""
  )

  # One instance for the process (`AppConfig.instance.site_url`); specs that need a different
  # value stub it: `allow(AppConfig).to receive(:instance).and_return(AppConfig.new(...))`.
  def self.instance
    @instance ||= new
  end

  def mission_control?
    mission_control_user.present? && mission_control_password.present?
  end
end
