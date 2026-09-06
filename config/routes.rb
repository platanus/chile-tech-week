Rails.application.routes.draw do
  # Reveal health status on /up that returns 200 if the app boots with no exceptions,
  # otherwise 500. Load balancers and uptime monitors read it.
  get "up" => "rails/health#show", :as => :rails_health_check

  root "home#show"

  # The current edition: the programme, the submission form and each event's status page
  # (its id is the unguessable uuid the host receives by email), where the host publishes.
  resources :events, only: [:index, :new, :create, :show]
  post "events/:id/publish", to: "event_publications#create", as: :publish_event

  # The public Luma calendar every published event ends up in.
  get "luma", to: redirect(AppConfig.instance.luma_calendar_url)

  # The 2026 brand kit (public/brand, built by npm run brand:marks), the icon page and the
  # wireframe generator.
  get "brand", to: "brand#show", as: :brand
  get "brand/icon", to: "brand#icon", as: :brand_icon
  get "brand/wireframe-gen", to: "brand#wireframe", as: :brand_wireframe

  # The OpenGraph image as a 1200×630 stage to screenshot.
  get "opengraph", to: "opengraph#show", as: :opengraph

  # The 2025 edition, kept as it ran on the old site: its landing, its programme and its
  # brand kit (Edition2025::*Controller, pages/Edition2025/*).
  namespace :edition2025, path: "25" do
    root "home#show"
    resources :events, only: :index
    get "brand", to: "brand#show"
  end
  # The condor flock: the pilot's identity over HTTP (FlockChannel carries the flight itself).
  resource :flock_session, path: "flock/session", only: [:create, :update]

  # The moderation panel (Admin::BaseController: signed-in admins only). Devise signs admins
  # in at /admin/login (Admin::SessionsController renders the Inertia page) and out at
  # /admin/logout; there is no sign-up or password reset.
  devise_for :users, path: "admin", path_names: {sign_in: "login", sign_out: "logout"},
    controllers: {sessions: "admin/sessions"}, skip: [:registrations, :passwords]
  namespace :admin do
    # /admin with no week in it: Admin::BaseController sends you to the nearest one's events.
    root "events#index"

    # Every page of the panel is about one Chile Tech Week, named by the two digits it is
    # known by: /admin/25/events, /admin/26/emails. The switcher in the sidebar swaps them.
    scope ":week", constraints: {week: /\d{2}/} do
      resources :events, only: [:index, :show, :update] do
        resource :approval, only: :create, controller: "event_approvals"
        resource :rejection, only: :create, controller: "event_rejections"
        resources :cohosts, only: [:create, :update, :destroy]
      end
      resources :outbound_emails, only: [:index, :show], path: "emails" do
        resource :resend, only: :create, controller: "outbound_email_resends"
      end
      resources :tasks, only: :index do
        resource :run, only: :create, controller: "task_runs"
      end
    end
  end

  # Solid Queue dashboard, only when its basic-auth credentials are configured.
  mount MissionControl::Jobs::Engine, at: "/admin/jobs" if AppConfig.instance.mission_control?
end
