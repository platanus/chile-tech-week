require "rails_helper"

RSpec.describe MirrorLumaCoverJob do
  let(:url) { "https://images.lumacdn.com/event-covers/abc.png" }
  let(:event) { create(:event, luma_cover_url: url) }
  let(:png) { Rails.root.join("spec/fixtures/files/logo.png").binread }

  def width_of(attachment)
    Vips::Image.new_from_buffer(attachment.download, "").width
  end

  it "downloads the cover and keeps it as the event's own copy, as a web-sized WebP" do
    stub_request(:get, url).to_return(status: 200, body: png, headers: {"Content-Type" => "image/png"})

    described_class.perform_now(event.id, url)

    expect(event.reload.cover).to be_attached
    expect(event.cover.content_type).to eq("image/webp")
    expect(event.cover.filename.to_s).to eq("abc.webp")
    expect(event.cover_image_url).to match(%r{\A/rails/active_storage/blobs/proxy/})
    expect(event.cover_thumb).to be_attached
    expect(event.cover_thumb_url).to match(%r{\A/rails/active_storage/blobs/proxy/.*abc-thumb\.webp\z})
  end

  it "shrinks Luma's 2048-pixel covers to the page size and a small card size" do
    big = Vips::Image.black(2048, 2048).write_to_buffer(".png")
    stub_request(:get, url).to_return(status: 200, body: big, headers: {"Content-Type" => "image/png"})

    described_class.perform_now(event.id, url)

    expect(width_of(event.reload.cover)).to eq(1200)
    expect(width_of(event.cover_thumb)).to eq(360)
    expect(event.cover.byte_size).to be < big.bytesize
  end

  it "never enlarges a small cover" do
    stub_request(:get, url).to_return(status: 200, body: Vips::Image.black(200, 100).write_to_buffer(".png"), headers: {"Content-Type" => "image/png"})

    described_class.perform_now(event.id, url)

    expect(width_of(event.reload.cover)).to eq(200)
  end

  it "keeps the original as the cover when the image cannot be resized" do
    stub_request(:get, url).to_return(status: 200, body: "not really a png", headers: {"Content-Type" => "image/png"})

    described_class.perform_now(event.id, url)

    expect(event.reload.cover).to be_attached
    expect(event.cover.content_type).to eq("image/png")
    expect(event.cover_thumb).not_to be_attached
    expect(event.cover_thumb_url).to eq(event.cover_image_url)
  end

  it "follows a redirect to the real file" do
    stub_request(:get, url).to_return(status: 302, headers: {"Location" => "https://images.lumacdn.com/real.jpg"})
    stub_request(:get, "https://images.lumacdn.com/real.jpg").to_return(status: 200, body: png, headers: {"Content-Type" => "image/jpeg"})

    described_class.perform_now(event.id, url)

    expect(event.reload.cover).to be_attached
  end

  it "gives up quietly on anything that is not an image, and leaves Luma's URL in place" do
    stub_request(:get, url).to_return(status: 200, body: "<html>nope</html>", headers: {"Content-Type" => "text/html"})

    expect { described_class.perform_now(event.id, url) }.not_to raise_error

    expect(event.reload.cover).not_to be_attached
    expect(event.cover_image_url).to eq(url)
  end

  it "gives up quietly when Luma answers an error or the request dies" do
    stub_request(:get, url).to_return(status: 403, body: "no")
    expect { described_class.perform_now(event.id, url) }.not_to raise_error

    stub_request(:get, url).to_timeout
    expect { described_class.perform_now(event.id, url) }.not_to raise_error

    expect(event.reload.cover).not_to be_attached
  end

  it "refuses an image over the size cap" do
    stub_request(:get, url).to_return(status: 200, body: "x" * (described_class::MAX_BYTES + 1), headers: {"Content-Type" => "image/png"})

    described_class.perform_now(event.id, url)

    expect(event.reload.cover).not_to be_attached
  end

  it "does nothing when the event moved on to another cover, or is gone" do
    stub_request(:get, url)

    described_class.perform_now(event.id, "https://images.lumacdn.com/stale.png")
    described_class.perform_now(SecureRandom.uuid, url)

    expect(event.reload.cover).not_to be_attached
    expect(a_request(:get, url)).not_to have_been_made
  end
end
