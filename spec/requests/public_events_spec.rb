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
