require "rails_helper"

RSpec.describe Events::Publish do
  include ActiveJob::TestHelper

  let(:client) { Luma::FakeClient.instance }

  before { client.reset! }

  def waiting
    luma = client.create_event(name: "Demo Day", start_at: "2026-11-18T21:00:00Z", end_at: "2026-11-18T23:00:00Z", visibility: "private")
    create(:event, edition: 2026, state: "waiting_luma_edit", title: "Demo Day", starts_at: Time.zone.parse("2026-11-18T21:00:00Z"),
      ends_at: Time.zone.parse("2026-11-18T23:00:00Z"), luma_event_api_id: luma.api_id, luma_event_url: luma.url, luma_cover_url: luma.cover_url)
  end

  it "makes the Luma event public and publishes the event" do
    event = waiting

    expect(described_class.new(event).call).to have_attributes(ok: true)
    expect(client.events.fetch(event.luma_event_api_id).visibility).to eq("public")
    expect(event.reload).to have_attributes(state: "published", published_at: be_present)
  end

  it "pulls the host's latest Luma edits right away, without mailing them about their own changes" do
    event = waiting
    client.update_event(event.luma_event_api_id, name: "Demo Night", start_at: "2026-11-18T22:00:00Z", description_md: "La agenda final.")

    expect { described_class.new(event).call }.not_to have_enqueued_mail(EventMailer, :luma_updated)
    expect(event.reload).to have_attributes(state: "published", title: "Demo Night", starts_at: Time.zone.parse("2026-11-18T22:00:00Z"),
      luma_description_md: "La agenda final.")
  end

  it "still publishes when the pull fails" do
    event = waiting
    allow(client).to receive(:update_event).and_return({})
    allow(client).to receive(:get_event).and_raise(Luma::Error, "timeout")

    expect(described_class.new(event).call).to have_attributes(ok: true)
    expect(event.reload.state).to eq("published")
  end

  it "does not publish an event the host cancelled on Luma" do
    event = waiting
    allow(client).to receive(:update_event).and_return({})
    client.cancel(event.luma_event_api_id)

    expect(described_class.new(event).call).to have_attributes(ok: false, error: "El evento fue cancelado en Luma.")
    expect(event.reload.state).to eq("deleted")
  end

  it "refuses an event that is not waiting for the host" do
    event = create(:event, edition: 2026, state: "submitted")

    expect(described_class.new(event).call).to have_attributes(ok: false)
    expect(event.reload.state).to eq("submitted")
  end
end
