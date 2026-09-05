require "rails_helper"

RSpec.describe Legacy2025::Importer do
  # Rows shaped like Legacy2025::Source returns them: string keys, string values, the old
  # column names (start_date, "waiting-luma-edit").
  let(:event_row) do
    {
      "id" => "7d6b0b59-8259-4ff4-a655-bac8f4e56659",
      "public_id" => "a01ad24e-952a-4196-b6fb-d25a17627869",
      "author_email" => "host@example.com",
      "author_name" => "Host",
      "author_phone_number" => "+56912345678",
      "company_name" => "etm",
      "company_website" => "https://etmday.org/",
      "company_logo_url" => "https://blob.example/etm.png",
      "title" => "Lanzamiento Oficial EtMday 2025",
      "description" => "Kickoff EtMday 2025.",
      "start_date" => "2025-11-20 15:00:00+00",
      "end_date" => "2025-11-20 16:30:00+00",
      "commune" => "Vitacura",
      "latitude" => nil,
      "longitude" => nil,
      "format" => "networking",
      "capacity" => "500",
      "luma_event_api_id" => "evt-eqzsywCdMw3F6Dr",
      "luma_event_url" => "https://luma.com/jhlppcsu",
      "luma_event_created_at" => "2025-10-01 12:32:58.674+00",
      "custom_url" => nil,
      "state" => "waiting-luma-edit",
      "submitted_at" => "2025-09-30 17:14:01.247+00",
      "approved_at" => "2025-10-01 12:32:58.668+00",
      "rejected_at" => nil,
      "rejection_reason" => nil,
      "waiting_luma_edit_at" => "2025-10-01 12:32:58.668+00",
      "published_at" => nil,
      "deleted_at" => nil,
      "logo_shown_at" => "2025-10-01 00:53:44.156052+00",
      "created_at" => "2025-09-30 17:14:01.306833+00",
      "updated_at" => "2025-10-08 15:01:07.165+00"
    }
  end
  let(:theme_row) { {"id" => "11dd2d2c-1aaf-4ac1-b050-2d8e2452e01b", "name" => "AI", "slug" => "ai", "created_at" => "2025-09-23 16:30:00.167244+00"} }
  let(:audience_row) { {"id" => "41d44b8b-c0e6-44d8-92cb-3470dbb7c03e", "name" => "Investors", "slug" => "investors", "created_at" => "2025-09-25 17:03:05.718926+00"} }
  let(:link) { {"id" => "4e036e34-9e09-47e7-a406-3c0c4d25ba19", "event_id" => event_row["id"], "theme_id" => theme_row["id"], "created_at" => "2025-09-25 19:02:59.331893+00"} }
  let(:duplicate_link) { link.merge("id" => "6d13e114-c3df-4866-b6bd-7a81317c60b9") }
  let(:audience_link) { {"id" => "0d3f4d0a-6b7f-4c5a-9a0e-1c2b3d4e5f60", "event_id" => event_row["id"], "audience_id" => audience_row["id"], "created_at" => "2025-09-25 19:02:59.331893+00"} }
  let(:cohost_row) do
    {
      "id" => "3c1c47af-834d-4633-b0da-c736be7894f6", "event_id" => event_row["id"], "company_name" => "BCI",
      "company_logo_url" => "https://blob.example/bci.png", "primary_contact_name" => "Diego",
      "primary_contact_email" => "diego@example.com", "primary_contact_phone_number" => "+56996491786",
      "primary_contact_website" => "https://www.bci.cl/", "primary_contact_linkedin" => nil,
      "logo_shown_at" => "2025-11-07 13:23:30.342+00", "created_at" => "2025-11-05 12:59:17.712636+00",
      "updated_at" => "2025-11-07 13:23:30.342+00"
    }
  end
  let(:source) do
    instance_double(Legacy2025::Source, events: [event_row], themes: [theme_row], audiences: [audience_row],
      event_themes: [link, duplicate_link], event_audiences: [audience_link], cohosts: [cohost_row])
  end

  it "copies every table into the 2025 edition, keeping ids, values and timestamps" do
    counts = described_class.new(source).run

    expect(counts.to_h).to eq(themes: 1, audiences: 1, events: 1, event_themes: 1, event_audiences: 1, cohosts: 1)

    event = Event.find(event_row["id"])
    expect(event).to have_attributes(
      edition: 2025, public_id: event_row["public_id"], title: "Lanzamiento Oficial EtMday 2025",
      company_name: "etm", commune: "Vitacura", format: "networking", capacity: 500,
      state: "waiting_luma_edit", luma_event_url: "https://luma.com/jhlppcsu",
      starts_at: Time.utc(2025, 11, 20, 15), ends_at: Time.utc(2025, 11, 20, 16, 30),
      created_at: Time.utc(2025, 9, 30, 17, 14, 1.306833r), updated_at: Time.utc(2025, 10, 8, 15, 1, 7.165r)
    )
    expect(event.themes.map(&:name)).to eq(["AI"])
    expect(event.audiences.map(&:name)).to eq(["Investors"])
    expect(event.cohosts.sole).to have_attributes(id: cohost_row["id"], company_name: "BCI", logo_shown_at: be_present)
    expect(Theme.find(theme_row["id"])).to have_attributes(slug: "ai", created_at: Time.utc(2025, 9, 23, 16, 30, 0.167244r))
  end

  it "can be re-run over an existing archive without duplicating or resetting anything" do
    described_class.new(source).run
    Event.find(event_row["id"]).update!(company_logo_url: "/25/logos/etm.png")

    described_class.new(source).run

    expect(Event.count).to eq(1)
    expect(EventTheme.count).to eq(1)
    # The import is the source of truth: a re-run restores the old site's value.
    expect(Event.sole.company_logo_url).to eq("https://blob.example/etm.png")
  end

  it "refuses a row this app's schema cannot hold instead of writing part of the archive" do
    source = instance_double(Legacy2025::Source, events: [event_row.merge("format" => "karaoke")], themes: [theme_row], audiences: [], event_themes: [], event_audiences: [], cohosts: [])

    expect { described_class.new(source).run }.to raise_error(ActiveRecord::RecordInvalid, /Format/)
    expect(Theme.count).to eq(0)
  end
end
