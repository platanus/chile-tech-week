require "rails_helper"

RSpec.describe Event do
  it { is_expected.to have_many(:cohosts).dependent(:destroy) }
  it { is_expected.to have_many(:themes).through(:event_themes) }
  it { is_expected.to have_many(:audiences).through(:event_audiences) }
  it { is_expected.to validate_presence_of(:title) }
  it { is_expected.to validate_presence_of(:commune) }

  it "only accepts the 2025 site's formats and states" do
    event = build(:event, format: "networking", state: "published")
    expect(event).to be_valid

    event.format = "karaoke"
    expect(event).not_to be_valid
    expect(event.errors[:format]).to be_present
  end

  it "keeps the 2025 state names as scopes" do
    published = create(:event, :published)
    create(:event, state: "waiting_luma_edit")

    expect(described_class.published).to eq([published])
    expect(described_class.waiting_luma_edit.count).to eq(1)
  end

  it "rejects an end before the start" do
    event = build(:event, starts_at: Time.zone.local(2025, 11, 18, 18), ends_at: Time.zone.local(2025, 11, 18, 17))

    expect(event).not_to be_valid
    expect(event.errors[:ends_at]).to include("must be after the start")
  end

  describe ".chronological" do
    it "orders by start, then end, then title" do
      later = create(:event, starts_at: Time.zone.local(2025, 11, 19, 10), title: "B")
      earlier_long = create(:event, starts_at: Time.zone.local(2025, 11, 18, 10), ends_at: Time.zone.local(2025, 11, 18, 14), title: "C")
      earlier_short = create(:event, starts_at: Time.zone.local(2025, 11, 18, 10), ends_at: Time.zone.local(2025, 11, 18, 12), title: "A")

      expect(described_class.chronological).to eq([earlier_short, earlier_long, later])
    end
  end

  describe "#registration_url" do
    it "prefers the host's own page over the Luma event" do
      expect(build(:event, luma_event_url: "https://luma.com/x", custom_url: "https://hack.platan.us").registration_url).to eq("https://hack.platan.us")
      expect(build(:event, luma_event_url: "https://luma.com/x", custom_url: "").registration_url).to eq("https://luma.com/x")
      expect(build(:event, luma_event_url: nil, custom_url: nil).registration_url).to be_nil
    end
  end
end
