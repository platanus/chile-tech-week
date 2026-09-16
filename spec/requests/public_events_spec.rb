require "rails_helper"

RSpec.describe "public event pages" do
  it "shows the synced body and cover without organizer contact or moderation data" do
    event = create(:event, :published, title: "Demo Day", luma_description_md: "## Agenda\n\n**Demos**", luma_cover_url: "https://images.lumacdn.com/cover.png")
    create(:cohost, event: event, company_name: "Partner", primary_contact_email: "private@example.com")

    get public_event_path(slug: event.slug)

    expect(response).to have_http_status(:ok)
    expect(inertia).to render_component("PublicEvents/Show")
    expect(inertia).to have_props { |props|
      expect(props[:event]).to include(
        "title" => "Demo Day", "coverImageUrl" => "https://images.lumacdn.com/cover.png",
        "bodyHtml" => include("<h2>Agenda</h2>", "<strong>Demos</strong>"),
        "publicUrl" => "/demo-day", "cohosts" => [include("companyName" => "Partner")]
      )
      expect(props[:event].keys).not_to include("authorEmail", "authorPhoneNumber", "state", "rejectionReason", "lumaEventApiId")
      expect(props[:event].to_json).not_to include("private@example.com")
    }
  end

  it "uses the summary before the first sync, but respects an explicitly cleared body" do
    event = create(:event, :published, description: "Short summary")
    get public_event_path(slug: event.slug)
    expect(inertia).to have_props { |props| props[:event][:bodyHtml].include?("Short summary") }
    event.update!(luma_description_md: "")
    get public_event_path(slug: event.slug)
    expect(inertia).to have_props { |props| props[:event][:bodyHtml] == "" }
  end

  it "carries the event as schema.org JSON-LD and links its Markdown twin" do
    event = create(:event, :published, edition: 2026, title: "Demo Day", starts_at: Time.zone.local(2026, 11, 18, 18),
      commune: "Providencia", company_name: "Platanus", luma_cover_url: "https://images.lumacdn.com/cover.png")

    get public_event_path(slug: event.slug)

    expect(response.body).to include(%(<link rel="alternate" href="https://techweek.cl/demo-day.md" type="text/markdown">))
    expect(response.body).not_to include('name="robots"')
    node = structured_node("SocialEvent")
    expect(node).to include("name" => "Demo Day", "url" => "https://techweek.cl/demo-day", "startDate" => "2026-11-18T18:00:00-03:00",
      "offers" => {"@type" => "Offer", "url" => "https://luma.com/example", "availability" => "https://schema.org/InStock"})
    expect(node["location"]).to include("name" => "Providencia")
    expect(node["organizer"].first).to include("name" => "Platanus")
    expect(node["image"]).to eq(["https://images.lumacdn.com/cover.png", "https://techweek.cl/demo-day/opengraph"])
    expect(structured_data.map { |n| n["@type"] }).to eq(%w[Organization WebSite SocialEvent])
  end

  it "serves the event as Markdown at .md and by content negotiation, never before it is published" do
    event = create(:event, :published, edition: 2026, title: "Demo Day", luma_description_md: "## Agenda")

    get "/demo-day.md"
    expect(response).to have_http_status(:ok)
    expect(response.media_type).to eq("text/markdown")
    expect(response.body).to start_with("# Demo Day\n\n> An event.\n\n- **Cuándo:** ")
    expect(response.body).to include("- **Página:** https://techweek.cl/demo-day\n", "## Descripción\n\n## Agenda\n")
    expect(response.body).not_to include(event.author_email)

    get "/demo-day", headers: {"Accept" => "text/markdown"}
    expect(response.media_type).to eq("text/markdown")

    event.update!(state: "waiting_luma_edit")
    get "/demo-day.md"
    expect(response).to have_http_status(:not_found)
  end

  (Event::STATES - ["published"]).each do |state|
    it "does not expose #{state} events at a public slug" do
      event = create(:event, state: state)
      get public_event_path(slug: event.slug)
      expect(response).to have_http_status(:not_found)
    end
  end

  it "returns 404 for unknown slugs and preserves the organizer's UUID route" do
    get "/no-such-event"
    expect(response).to have_http_status(:not_found)
    event = create(:event)
    get event_path(event)
    expect(inertia).to render_component("Events/Show")
    get "/events"
    expect(inertia).to render_component("Events/Index")
  end
end
