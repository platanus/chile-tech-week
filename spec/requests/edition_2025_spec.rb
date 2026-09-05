require "rails_helper"

RSpec.describe "the 2025 edition" do
  let(:meta) do
    {
      title: "Chile Tech Week 2025",
      description: "The decentralized Tech Week in Chile. November 17-23, 2025.",
      opengraphImage: "/25/opengraph.png"
    }
  end

  describe "GET /25" do
    it "renders the 2025 landing with its metadata and the companies that agreed to be shown" do
      shown = create(:event, :published, :logo_shown, company_name: "Platanus", company_logo_url: "/25/logos/platanus.png")
      create(:cohost, event: shown, company_name: "BCI", company_logo_url: "/25/logos/bci.png", logo_shown_at: Time.current)
      create(:event, :published, company_name: "Shy", company_logo_url: "/25/logos/shy.png")

      get "/25"

      expect(response).to have_http_status(:ok)
      expect(inertia).to render_component("Edition2025/Home/Show")
      expect(inertia).to have_props(
        **meta,
        logos: [
          {companyName: "Platanus", logoUrl: "/25/logos/platanus.png"},
          {companyName: "BCI", logoUrl: "/25/logos/bci.png"}
        ]
      )
    end

    it "carries the 2025 OpenGraph card in the server-rendered head" do
      get "/25"

      expect(response.body).to include(%(property="og:image" content="https://techweek.cl/25/opengraph.png"))
      expect(response.body).to include(%(property="og:title" content="Chile Tech Week 2025"))
      expect(response.body).to include(%(name="twitter:card" content="summary_large_image"))
    end
  end

  describe "GET /25/events" do
    it "lists the 2025 programme in order, with topics, audiences and co-hosts, and nothing private" do
      theme = create(:theme, name: "Fintech")
      audience = create(:audience, name: "Investors")
      later = create(:event, :published, title: "Later", starts_at: Time.zone.local(2025, 11, 20, 10))
      earlier = create(:event, :published, title: "Earlier", starts_at: Time.zone.local(2025, 11, 18, 10),
        custom_url: "https://hack.platan.us", themes: [theme], audiences: [audience])
      create(:cohost, event: earlier, company_name: "BCI", primary_contact_email: "secret@bci.cl")
      create(:event, state: "waiting_luma_edit", title: "Not yet")
      create(:event, :published, edition: 2026, title: "Next year")

      get "/25/events"

      expect(response).to have_http_status(:ok)
      expect(inertia).to render_component("Edition2025/Events/Index")
      expect(inertia).to have_props(**meta)
      events = inertia.props.fetch(:events).map(&:deep_symbolize_keys)
      expect(events.map { |event| event[:title] }).to eq(["Earlier", "Later"])
      expect(events.first).to include(
        id: earlier.id, registrationUrl: "https://hack.platan.us", commune: "Providencia",
        format: "networking", startsAt: earlier.starts_at.iso8601(3),
        themes: [{id: theme.id, name: "Fintech", slug: "fintech"}],
        audiences: [{id: audience.id, name: "Investors", slug: "investors"}]
      )
      expect(events.first[:cohosts].sole).to eq(id: earlier.cohosts.sole.id, companyName: "BCI", companyLogoUrl: "https://example.com/cohost.png")
      expect(events.last).to include(id: later.id, registrationUrl: "https://luma.com/example")
      expect(response.body).not_to include("secret@bci.cl", earlier.author_email, earlier.author_phone_number)
    end
  end

  describe "GET /25/brand" do
    it "renders the brand kit and serves its files" do
      get "/25/brand"

      expect(response).to have_http_status(:ok)
      expect(inertia).to render_component("Edition2025/Brand/Show")
      expect(inertia).to have_props(**meta, title: "Brand Kit · Chile Tech Week 2025")
      expect(Rails.public_path.join("25/brand/logo-rectangle.svg")).to exist
      expect(Rails.public_path.join("25/opengraph.png")).to exist
    end
  end
end
