require "rails_helper"

# An event the host made on Luma (Luma::Import) is theirs: approving it only lists it, taking it
# down only unlists it, and Luma::Sync reads it through the read-only route.
RSpec.describe "imported events" do
  include ActiveJob::TestHelper

  let(:client) { Luma::FakeClient.instance }

  before { client.reset! }

  def imported(state: "submitted")
    luma = client.create_event(name: "Demo Day", start_at: "2026-11-18T21:00:00Z", end_at: "2026-11-18T23:00:00Z", visibility: "public")
    create(:event, edition: 2026, state: state, title: "Demo Day", starts_at: Time.zone.parse("2026-11-18T21:00:00Z"),
      ends_at: Time.zone.parse("2026-11-18T23:00:00Z"), luma_event_api_id: luma.api_id, luma_event_url: luma.url,
      luma_cover_url: luma.cover_url, luma_imported_at: Time.current, author_email: "ada@example.com")
  end

  describe Events::Approve do
    it "lists the event in the Luma calendar and publishes it, with no editing step" do
      event = imported
      result = nil

      expect { result = described_class.new(event).call }.to have_enqueued_mail(EventMailer, :published)

      expect(result.ok).to be(true)
      expect(event.reload).to have_attributes(state: "published", approved_at: be_present, published_at: be_present,
        luma_calendar_event_id: "calev-#{event.luma_event_api_id}")
      expect(client.calendar).to eq([event.luma_event_api_id])
      expect(MirrorLumaCoverJob).to have_been_enqueued.with(event.id, event.luma_cover_url)
    end

    it "does not create anything on Luma" do
      event = imported
      expect(client).not_to receive(:create_event)

      described_class.new(event).call
    end

    it "takes the host's latest edits before publishing" do
      event = imported
      client.update_event(event.luma_event_api_id, name: "Demo Night")

      described_class.new(event).call

      expect(event.reload.title).to eq("Demo Night")
    end

    it "does not publish an event the host cancelled on Luma" do
      event = imported
      client.cancel(event.luma_event_api_id)

      expect(described_class.new(event).call).to have_attributes(ok: false, error: "El evento fue cancelado en Luma.")
      expect(event.reload.state).to eq("deleted")
      expect(client.calendar).to be_empty
    end

    it "reports a calendar failure without publishing" do
      event = imported
      allow(client).to receive(:add_to_calendar).and_raise(Luma::Error, "quota")

      expect(described_class.new(event).call).to have_attributes(ok: false, error: include("quota"))
      expect(event.reload.state).to eq("submitted")
    end
  end

  describe Events::TakeDown do
    it "takes the event out of the calendar and leaves it on Luma" do
      event = imported
      Events::Approve.new(event).call
      expect(client).not_to receive(:cancel_event)

      result = described_class.new(event.reload, reason: "No cumple las reglas").call

      expect(result.ok).to be(true)
      expect(client.calendar).to be_empty
      expect(event.reload).to have_attributes(state: "deleted", deletion_reason: "No cumple las reglas")
      expect(client.get_event(event.luma_event_api_id)).to be_present
    end

    it "still cancels the events the site created itself" do
      luma = client.create_event(name: "Demo Day", start_at: "2026-11-18T21:00:00Z", end_at: "2026-11-18T23:00:00Z", visibility: "public")
      event = create(:event, :published, edition: 2026, luma_event_api_id: luma.api_id)

      described_class.new(event, reason: "x").call

      expect { client.get_event(luma.api_id) }.to raise_error(Luma::NotFound)
    end
  end

  describe Luma::Sync do
    it "reads an imported event through the read-only route" do
      event = imported(state: "published")
      client.update_event(event.luma_event_api_id, name: "Demo Night")
      allow(client).to receive(:get_event_readonly).and_call_original

      described_class.new(client: client).call

      expect(client).to have_received(:get_event_readonly).with(event.luma_event_api_id)
      expect(event.reload.title).to eq("Demo Night")
    end

    it "takes an imported event down when the host cancels it" do
      event = imported(state: "published")
      client.cancel(event.luma_event_api_id)

      expect(described_class.new(client: client).call).to have_attributes(cancelled: 1)
      expect(event.reload.state).to eq("deleted")
    end
  end
end
