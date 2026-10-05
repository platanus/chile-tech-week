require "rails_helper"

RSpec.describe "the site in Spanish and English" do
  def shared(key)
    inertia.props.fetch(key)
  end

  describe "the URL decides the language" do
    it "serves the landing in English under /en, with the document in English" do
      get "/en"

      expect(inertia).to render_component("Home/Show")
      expect(inertia).to have_props(title: "Chile Tech Week 2026 · November 16–22", locale: "en")
      expect(response.body).to include('<html lang="en">')
    end

    it "keeps the programme's links, days and names in English" do
      event = create(:event, :published, edition: 2026, starts_at: Time.zone.local(2026, 11, 16, 10))

      get "/en/events"

      expect(inertia).to have_props(title: "Events · Chile Tech Week 2026")
      expect(inertia.props.fetch(:events).first.fetch(:publicUrl)).to eq("/en/#{event.slug}")
      expect(inertia.props.fetch(:days).first.fetch(:label)).to eq("Mon 16")
    end

    it "shows the same event under /en/<slug>, the host's own words unchanged" do
      event = create(:event, :published, edition: 2026, title: "Demo Day de fintechs", description: "Doce startups presentan.")

      get "/en/#{event.slug}"

      expect(inertia).to render_component("PublicEvents/Show")
      expect(inertia.props.fetch(:event)).to include(title: "Demo Day de fintechs", description: "Doce startups presentan.")
      expect(response.body).to include(%(/en/#{event.slug}/opengraph?v=))
    end

    it "announces each page's twin in the other language, Spanish being the default" do
      get "/en/events?day=2026-11-16"

      expect(response.body).to include(%(<link rel="alternate" href="https://techweek.cl/events?day=2026-11-16" hreflang="es">))
        .and include(%(<link rel="alternate" href="https://techweek.cl/en/events?day=2026-11-16" hreflang="en">))
        .and include(%(<link rel="alternate" href="https://techweek.cl/events?day=2026-11-16" hreflang="x-default">))
        .and include(%(<meta property="og:locale" content="en_US">))
      expect(shared(:localeSwitch)).to include(alternates: {"es" => "/events?day=2026-11-16", "en" => "/en/events?day=2026-11-16"})
    end

    it "keeps the Spanish site where it was" do
      get "/events"

      expect(inertia).to have_props(title: "Eventos · Chile Tech Week 2026", locale: "es")
      expect(response.body).to include('<html lang="es">')
    end
  end

  describe "the visitor's choice" do
    it "sends someone who chose English from the bare root to /en" do
      cookies[:locale] = "en"
      get "/"

      expect(response).to redirect_to("/en")
    end

    it "never moves a deep link, whatever the choice" do
      cookies[:locale] = "en"
      get "/events"

      expect(inertia).to have_props(locale: "es")
    end

    it "leaves the root alone for someone who chose Spanish" do
      cookies[:locale] = "es"
      get "/"

      expect(inertia).to render_component("Home/Show")
    end
  end

  describe "the suggestion banner" do
    def suggestion_for(path, country: nil, language: nil)
      headers = {"CF-IPCountry" => country, "Accept-Language" => language}.compact
      get(path, headers: headers)
      shared(:localeSwitch)[:suggestion]
    end

    it "offers nothing in Spanish to anyone in a Spanish-speaking country, even on an English browser" do
      expect(suggestion_for("/", country: "CL", language: "en-US,en;q=0.9")).to be_nil
      expect(suggestion_for("/", country: "MX", language: "en-GB")).to be_nil
    end

    it "offers English elsewhere when the browser's first language is not Spanish" do
      expect(suggestion_for("/", country: "US", language: "en-US,en;q=0.9,es;q=0.8")).to eq("en")
      expect(suggestion_for("/", country: "BR", language: "pt-BR,pt;q=0.9")).to eq("en")
    end

    it "offers nothing to a Spanish browser abroad" do
      expect(suggestion_for("/", country: "US", language: "es-US,es;q=0.9,en;q=0.8")).to be_nil
    end

    it "offers Spanish on an English page to someone who reads it" do
      expect(suggestion_for("/en", country: "CL", language: "en-US")).to eq("es")
      expect(suggestion_for("/en", country: "DE", language: "es-ES")).to eq("es")
      expect(suggestion_for("/en", country: "US", language: "en-US")).to be_nil
    end

    it "stops offering once the visitor has chosen" do
      cookies[:locale] = "es"

      expect(suggestion_for("/events", country: "US", language: "en-US")).to be_nil
    end
  end

  describe "submitting in English" do
    let(:theme) { create(:theme) }
    let(:audience) { create(:audience) }

    it "remembers the language, answers in it and keeps the host on /en" do
      allow(EventNotifications).to receive(:submitted)
      params = {
        event: {
          company_name: "Platanus", company_website: "https://platan.us", author_name: "Ada", author_email: "ada@platan.us",
          author_phone_number: "+56 9 8765 4321", title: "Demo Day", description: "Twelve startups pitch.",
          starts_at: "2026-11-18T18:00", ends_at: "2026-11-18T20:00", address: "Avenida Providencia 2124",
          commune: "Providencia", format: "pitch_event_demo_day", capacity: "80",
          logo_upload: fixture_file_upload("logo-quality.png", "image/png"), theme_ids: [theme.id], audience_ids: [audience.id]
        }
      }

      post "/en/events", params: params

      event = Event.last
      expect(event.locale).to eq("en")
      expect(response).to redirect_to("/en/events/#{event.id}")
      follow_redirect!
      expect(inertia).to have_flash(notice: "Event submitted! We'll review it soon.")
    end

    it "explains what is wrong in English" do
      post "/en/events", params: {event: {title: ""}}

      expect(response).to redirect_to("/en/events/new")
      follow_redirect!
      expect(inertia.props.fetch(:errors)).to include("title" => ["Title can't be blank"])
    end
  end
end
