# Solid Queue's dashboard, mounted at /admin/jobs (config/routes.rb) behind HTTP basic auth
# when MISSION_CONTROL_USER / MISSION_CONTROL_PASSWORD are set. AppConfig is autoloaded, so
# it can only be read once the app has booted.
Rails.application.config.after_initialize do
  MissionControl::Jobs.http_basic_auth_enabled = true
  MissionControl::Jobs.http_basic_auth_user = AppConfig.instance.mission_control_user.presence
  MissionControl::Jobs.http_basic_auth_password = AppConfig.instance.mission_control_password.presence
end
