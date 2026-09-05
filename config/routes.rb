Rails.application.routes.draw do
  # Reveal health status on /up that returns 200 if the app boots with no exceptions,
  # otherwise 500. Load balancers and uptime monitors read it.
  get "up" => "rails/health#show", :as => :rails_health_check

  root "home#show"

  # Solid Queue dashboard, only when its basic-auth credentials are configured.
  mount MissionControl::Jobs::Engine, at: "/admin/jobs" if AppConfig.instance.mission_control?
end
