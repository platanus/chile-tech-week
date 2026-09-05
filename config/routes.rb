Rails.application.routes.draw do
  # Reveal health status on /up that returns 200 if the app boots with no exceptions,
  # otherwise 500. Load balancers and uptime monitors read it.
  get "up" => "rails/health#show", :as => :rails_health_check

  root "home#show"

  # The 2025 edition, kept as it ran on the old site: its landing, its programme and its
  # brand kit (Edition2025::*Controller, pages/Edition2025/*).
  namespace :edition2025, path: "25" do
    root "home#show"
    resources :events, only: :index
    get "brand", to: "brand#show"
  end
  # The condor flock: the pilot's identity over HTTP (FlockChannel carries the flight itself).
  resource :flock_session, path: "flock/session", only: [:create, :update]

  # Solid Queue dashboard, only when its basic-auth credentials are configured.
  mount MissionControl::Jobs::Engine, at: "/admin/jobs" if AppConfig.instance.mission_control?
end
