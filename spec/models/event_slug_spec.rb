require "rails_helper"

RSpec.describe Event, "public slugs" do
  it "normalizes accents and punctuation, and keeps the URL when the title changes" do
    event = create(:event, title: "Café & Tecnología: Santiago!")
    expect(event.slug).to eq("cafe-tecnologia-santiago")
    event.update!(title: "A new title from Luma")
    expect(event.reload.slug).to eq("cafe-tecnologia-santiago")
    expect(event.to_param).to eq(event.id)
  end

  it "disambiguates duplicate titles across editions and existing suffixes" do
    expect(create(:event, title: "Demo Day").slug).to eq("demo-day")
    expect(create(:event, title: "Demo Day 2").slug).to eq("demo-day-2")
    expect(create(:event, edition: 2026, title: "Demo Day").slug).to eq("demo-day-3")
  end

  it "avoids application routes and handles titles without Latin letters" do
    expect(create(:event, title: "Events").slug).to eq("events-2")
    expect(create(:event, title: "🎉").slug).to eq("evento")
    expect(create(:event, title: "🎉").slug).to eq("evento-2")
  end
end
