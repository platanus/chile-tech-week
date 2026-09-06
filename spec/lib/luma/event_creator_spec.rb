require "rails_helper"

RSpec.describe Luma::EventCreator do
  let(:client) { Luma::FakeClient.instance }
  let(:event) do
    create(:event, edition: 2026, title: "Demo Day", description: "Una demo.", author_email: "ada@example.com", commune: "Providencia", capacity: 80,
      starts_at: Time.zone.local(2026, 11, 18, 18, 0), ends_at: Time.zone.local(2026, 11, 18, 20, 0))
  end

  before do
    client.reset!
    create(:cohost, event: event, primary_contact_email: "co@example.com", company_name: "BCI", primary_contact_name: "Bea")
  end

  it "creates a private Luma event in Santiago time with the checklist description and the site's cover" do
    config = AppConfig.new(luma_cover_url: "https://techweek.cl/luma-cover.png", luma_allowed_cohost_dev: "ada@example.com")

    result = described_class.new(event, client: client, config: config).call

    expect(result.api_id).to start_with("evt-fake-")
    expect(result.url).to start_with("https://luma.com/fake-")
    created = client.events.fetch(result.api_id)
    expect(created).to have_attributes(name: "Demo Day", start_at: "2026-11-18T21:00:00Z", end_at: "2026-11-18T23:00:00Z", visibility: "private")
    attributes = described_class.new(event, client: client, config: config).attributes
    expect(attributes).to include(timezone: "America/Santiago", cover_url: "https://techweek.cl/luma-cover.png", tint_color: "#ee2b2b", capacity: 80, location: "Providencia")
    expect(attributes[:description_md]).to include("RECUERDA EDITAR", "Una demo.", "https://techweek.cl/events/#{event.id}?publish=true", "**BCI** — Bea (co@example.com)")
  end

  it "invites only the allow-listed hosts outside production" do
    config = AppConfig.new(luma_allowed_cohost_dev: "ada@example.com")

    result = described_class.new(event, client: client, config: config).call

    expect(result.invited).to eq(["ada@example.com"])
    expect(client.hosts[result.api_id]).to eq(["ada@example.com"])
  end

  it "invites the submitter and every co-host contact in production" do
    allow(Rails.env).to receive(:production?).and_return(true)

    expect(described_class.new(event, client: client, config: AppConfig.new).host_emails).to eq(["ada@example.com", "co@example.com"])
  end

  it "keeps the event when an invitation fails" do
    config = AppConfig.new(luma_allowed_cohost_dev: "ada@example.com,co@example.com")
    allow(client).to receive(:add_host).and_wrap_original do |m, api_id, email|
      raise Luma::Error, "no" if email == "co@example.com"
      m.call(api_id, email)
    end

    result = described_class.new(event, client: client, config: config).call

    expect(result.invited).to eq(["ada@example.com"])
    expect(result.failed).to eq(["co@example.com"])
  end
end
