require "rails_helper"

# The panel is always about one Chile Tech Week, the one in the URL: /admin/25/events,
# /admin/26/emails. This is what happens at its edges.
RSpec.describe "the panel's Tech Week" do
  before { sign_in create(:user) }

  it "sends /admin to the nearest week's events" do
    get "/admin"

    expect(response).to redirect_to("/admin/#{Week.current.slug}/events")
  end

  it "sends a week it has no row for to the nearest one" do
    get "/admin/99/events"

    expect(response).to redirect_to("/admin/#{Week.current.slug}/events")
  end

  it "shares the week and all of them with the page, for the switcher" do
    get "/admin/25/events"

    expect(inertia.props[:week].deep_symbolize_keys).to eq(slug: "25", year: 2025)
    expect(inertia.props.fetch(:weeks).map(&:deep_symbolize_keys)).to eq([{slug: "26", year: 2026}, {slug: "25", year: 2025}])
  end

  it "does not show an event that belongs to another week" do
    event = create(:event, edition: 2026)

    get "/admin/25/events/#{event.id}"

    expect(response).to have_http_status(:not_found)
  end

  it "lists only the mail this week's events produced" do
    create(:outbound_email, subject: "De 2025")
    create(:outbound_email, subject: "De 2026", event: create(:event, edition: 2026))

    get "/admin/25/emails"

    expect(inertia.props.fetch(:emails).map { |email| email["subject"] }).to eq(["De 2025"])
    expect(inertia.props[:stats].deep_symbolize_keys).to include(total: 1)
  end
end
