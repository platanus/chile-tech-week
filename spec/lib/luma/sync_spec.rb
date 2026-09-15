require "rails_helper"

RSpec.describe Luma::Sync do
  include ActiveJob::TestHelper

  let(:client) { Luma::FakeClient.instance }

  before { client.reset! }

  def linked(state: "waiting_luma_edit", **attributes)
    luma = client.create_event(name: "Demo Day", start_at: "2026-11-18T21:00:00Z", end_at: "2026-11-18T23:00:00Z", visibility: "private")
    create(:event, edition: 2026, state: state, title: "Demo Day", starts_at: Time.zone.parse("2026-11-18T21:00:00Z"), ends_at: Time.zone.parse("2026-11-18T23:00:00Z"),
      luma_event_api_id: luma.api_id, luma_event_url: luma.url, luma_cover_url: luma.cover_url, **attributes)
  end

  it "mirrors a changed title and dates and tells the host" do
    event = linked
    client.update_event(event.luma_event_api_id, name: "Demo Night", start_at: "2026-11-18T22:00:00Z")

    outcome = nil
    expect { outcome = described_class.new(client: client).call }.to have_enqueued_mail(EventMailer, :luma_updated)
    expect(outcome).to have_attributes(synced: 1, updated: 1, cancelled: 0, failed: 0)
    expect(event.reload).to have_attributes(title: "Demo Night", starts_at: Time.zone.parse("2026-11-18T22:00:00Z"))
  end

  it "stores new artwork from Luma, mirrors it, and does not write to the host about it" do
    event = linked(state: "published")
    client.update_event(event.luma_event_api_id, cover_url: "https://images.lumacdn.com/new-artwork.png")

    outcome = nil
    expect { outcome = described_class.new(client: client).call }.not_to have_enqueued_mail
    expect(outcome).to have_attributes(updated: 1)
    expect(event.reload.luma_cover_url).to eq("https://images.lumacdn.com/new-artwork.png")
    expect(MirrorLumaCoverJob).to have_been_enqueued.with(event.id, "https://images.lumacdn.com/new-artwork.png")
  end

  it "picks up the cover an event does not have yet, and then leaves it alone" do
    event = linked(state: "published", luma_cover_url: nil)

    expect { described_class.new(client: client).call }.to have_enqueued_job(MirrorLumaCoverJob)
    expect(event.reload.luma_cover_url).to eq(client.get_event(event.luma_event_api_id).cover_url)

    expect { described_class.new(client: client).call }.not_to have_enqueued_job(MirrorLumaCoverJob)
  end

  it "updates a changed URL silently" do
    event = linked(state: "published")
    client.update_event(event.luma_event_api_id, url: "https://luma.com/new-slug")

    expect { described_class.new(client: client).call }.not_to have_enqueued_mail
    expect(event.reload.luma_event_url).to eq("https://luma.com/new-slug")
  end

  %w[waiting_luma_edit published].each do |state|
    it "backfills and refreshes the full Markdown body for #{state} events without changing the summary or emailing" do
      event = linked(state: state)
      summary = event.description
      body = "# Sobre el evento\n\n#{"Descripción larga. " * 40}\n\n- **Charlas**\n- [Programa](https://techweek.cl/events)\n\n![Foto](https://images.lumacdn.com/photo.png)"
      client.update_event(event.luma_event_api_id, description_md: body)

      outcome = nil
      expect { outcome = described_class.new(client: client).call }.not_to have_enqueued_mail
      expect(outcome.updated).to eq(1)
      expect(event.reload).to have_attributes(luma_description_md: body, description: summary)

      expect { described_class.new(client: client).call }.not_to change { event.reload.updated_at }

      client.update_event(event.luma_event_api_id, description_md: "## Nuevo programa\n\nNos vemos mañana.")
      described_class.new(client: client).call
      expect(event.reload.luma_description_md).to eq("## Nuevo programa\n\nNos vemos mañana.")
    end
  end

  it "clears the stored body when the host empties it on Luma" do
    event = linked(luma_description_md: "Old body")
    client.update_event(event.luma_event_api_id, description_md: "")

    expect(described_class.new(client: client).call.updated).to eq(1)
    expect(event.reload.luma_description_md).to eq("")
  end

  it "preserves the stored body when Luma omits it, even when other fields change" do
    event = linked(luma_description_md: "Keep this body")
    client.update_event(event.luma_event_api_id, url: "https://luma.com/new-slug")

    described_class.new(client: client).call

    expect(event.reload).to have_attributes(luma_description_md: "Keep this body", luma_event_url: "https://luma.com/new-slug")
  end

  it "stores the Markdown body returned by the HTTP client" do
    event = linked
    body = "## Agenda\n\n- Bienvenida\n- **Demo**"
    stub_request(:get, "https://public-api.luma.com/v1/event/get?api_id=#{event.luma_event_api_id}")
      .to_return(status: 200, body: {event: {api_id: event.luma_event_api_id, description_md: body}}.to_json)

    described_class.new(client: Luma::Client.new("luma-key")).call

    expect(event.reload.luma_description_md).to eq(body)
  end

  it "takes down an event cancelled on Luma and tells the host" do
    event = linked(state: "published")
    client.cancel(event.luma_event_api_id)

    expect { described_class.new(client: client).call }.to have_enqueued_mail(EventMailer, :luma_cancelled)
    expect(event.reload).to have_attributes(state: "deleted")
    expect(event.deleted_at).to be_present
  end

  it "leaves untouched events alone and skips the unlinked, rejected and 2025 ones" do
    linked
    create(:event, state: "rejected", luma_event_api_id: "evt-x")
    create(:event, :published, edition: 2025, luma_event_api_id: nil)

    outcome = described_class.new(client: client).call

    expect(outcome).to have_attributes(synced: 1, updated: 0)
  end

  it "counts a Luma failure without stopping the others" do
    first = linked
    allow(client).to receive(:get_event).and_wrap_original do |m, api_id|
      raise Luma::Error, "boom" if api_id == first.luma_event_api_id
      m.call(api_id)
    end
    linked

    expect(described_class.new(client: client).call).to have_attributes(synced: 2, failed: 1)
  end
end
