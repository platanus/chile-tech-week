require "rails_helper"

RSpec.describe EventOpengraph do
  it "uses a rebuilt background immediately and changes its cache version" do
    Tempfile.create(["event-background", ".png"]) do |file|
      stub_const("EventOpengraph::BACKGROUND", file.path)
      renderer = described_class.new(create(:event))
      canvas = Vips::Image.black(1200, 630, bands: 3).copy(interpretation: :srgb)
      canvas.new_from_image([1, 2, 3]).pngsave(file.path)
      original_version = renderer.version
      expect(Vips::Image.new_from_buffer(renderer.render, "").getpoint(0, 0).first(3)).to eq([1, 2, 3])
      canvas.new_from_image([4, 5, 6]).pngsave(file.path)
      expect(renderer.version).not_to eq(original_version)
      expect(Vips::Image.new_from_buffer(renderer.render, "").getpoint(0, 0).first(3)).to eq([4, 5, 6])
    end
  end

  it "renders a 1200 by 630 PNG with a mirrored cover and a long, escaped title" do
    event = create(:event, title: "<b>Innovación & tecnología</b> " * 15)
    event.cover.attach(io: File.open(Rails.root.join("spec/fixtures/files/logo.png")), filename: "cover.png", content_type: "image/png")
    image = Vips::Image.new_from_buffer(described_class.new(event).render, "")
    expect([image.width, image.height]).to eq([1200, 630])
  end

  it "renders without a cover and changes the cache version with the title, date, organizer or artwork" do
    event = create(:event)
    initial = described_class.new(event).version
    expect(described_class.new(event).render).to start_with("\x89PNG".b)
    event.update!(title: "Another title")
    renamed = described_class.new(event).version
    expect(renamed).not_to eq(initial)
    event.update!(starts_at: event.starts_at - 1.hour)
    rescheduled = described_class.new(event).version
    expect(rescheduled).not_to eq(renamed)
    event.update!(company_name: "Another organizer")
    expect(described_class.new(event).version).not_to eq(rescheduled)
    event.cover.attach(io: File.open(Rails.root.join("spec/fixtures/files/logo.png")), filename: "cover.png", content_type: "image/png")
    expect(described_class.new(event).version).not_to eq(renamed)
  end
end
