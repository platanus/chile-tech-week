require "rails_helper"

RSpec.describe Event, "#cover_image_url" do
  it "serves the card's picture from the cover until a small copy exists" do
    event = create(:event)
    event.cover.attach(io: StringIO.new(Rails.root.join("spec/fixtures/files/logo.png").binread), filename: "c.png", content_type: "image/png")
    expect(event.cover_thumb_url).to eq(event.cover_image_url)

    event.cover_thumb.attach(io: StringIO.new(Rails.root.join("spec/fixtures/files/logo.png").binread), filename: "c-thumb.png", content_type: "image/png")
    expect(event.cover_thumb_url).not_to eq(event.cover_image_url)
  end

  it "is nil until the event has a Luma cover" do
    expect(create(:event).cover_image_url).to be_nil
  end

  it "is Luma's URL while there is no copy of our own" do
    event = create(:event, luma_cover_url: "https://images.lumacdn.com/abc.png")

    expect(event.cover_image_url).to eq("https://images.lumacdn.com/abc.png")
  end

  it "prefers our mirrored copy once it is attached" do
    event = create(:event, luma_cover_url: "https://images.lumacdn.com/abc.png")
    event.cover.attach(io: Rails.root.join("spec/fixtures/files/logo.png").open, filename: "abc.png", content_type: "image/png")

    expect(event.cover_image_url).to match(%r{\A/rails/active_storage/blobs/proxy/})
  end
end
