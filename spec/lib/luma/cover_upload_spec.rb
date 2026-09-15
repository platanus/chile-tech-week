require "rails_helper"

RSpec.describe Luma::CoverUpload do
  let(:source) { "https://techweek.cl/brand/logo.png" }
  let(:cdn) { "https://images.lumacdn.com/cover.png" }
  let(:client) { instance_double(Luma::Client) }
  let(:config) { AppConfig.new(luma_cover_url: source, luma_api_key: "key-one") }
  let(:cache) { ActiveSupport::Cache::MemoryStore.new }
  subject(:uploader) { described_class.new(client: client, config: config, cache: cache) }

  it "uploads the source and reuses the CDN URL for identical bytes" do
    stub_request(:get, source).to_return(body: "png-bytes", headers: {"Content-Type" => "image/png"})
    expect(client).to receive(:upload_image).with(body: "png-bytes", content_type: "image/png").once.and_return(cdn)
    2.times { expect(uploader.call).to eq(cdn) }
  end

  it "uploads again when the image bytes or API key change" do
    stub_request(:get, source).to_return(body: "old", headers: {"Content-Type" => "image/png"})
      .then.to_return(body: "new", headers: {"Content-Type" => "image/png"})
    expect(client).to receive(:upload_image).with(body: "old", content_type: "image/png").once.and_return(cdn)
    expect(client).to receive(:upload_image).with(body: "new", content_type: "image/png").twice.and_return(cdn)
    uploader.call
    uploader.call
    config.luma_api_key = "key-two"
    uploader.call
  end

  it "does not download a CDN URL or an unconfigured cover" do
    expect(client).not_to receive(:upload_image)
    config.luma_cover_url = cdn
    expect(uploader.call).to eq(cdn)
    config.luma_cover_url = ""
    expect(uploader.call).to be_nil
  end

  it "follows HTTPS redirects without sending the API key" do
    download = stub_request(:get, source).with { |request| !request.headers.key?("X-Luma-Api-Key") }
      .to_return(status: 302, headers: {"Location" => "/cover.jpg"})
    stub_request(:get, "https://techweek.cl/cover.jpg").to_return(body: "jpeg", headers: {"Content-Type" => "image/jpeg; charset=binary"})
    expect(client).to receive(:upload_image).with(body: "jpeg", content_type: "image/jpeg").and_return(cdn)
    expect(uploader.call).to eq(cdn)
    expect(download).to have_been_requested
  end

  it "does not cache failed uploads" do
    stub_request(:get, source).to_return(body: "png", headers: {"Content-Type" => "image/png"})
    allow(client).to receive(:upload_image).and_raise(Luma::Error, "upload failed")
    expect { uploader.call }.to raise_error(Luma::Error, "upload failed")
    expect(client).to receive(:upload_image).and_return(cdn)
    expect(uploader.call).to eq(cdn)
  end

  it "rejects empty, unsupported, oversized, and unsuccessful downloads before uploading" do
    expect(client).not_to receive(:upload_image)
    [
      {body: "", headers: {"Content-Type" => "image/png"}},
      {body: "html", headers: {"Content-Type" => "text/html"}},
      {body: "a" * (described_class::MAX_BYTES + 1), headers: {"Content-Type" => "image/png"}},
      {status: 404}
    ].each do |response|
      stub_request(:get, source).to_return(**response)
      expect { uploader.call }.to raise_error(Luma::Error)
    end
  end

  it "rejects redirect loops and insecure redirects" do
    stub_request(:get, source).to_return(status: 302, headers: {"Location" => source})
    expect { uploader.call }.to raise_error(Luma::Error, /redirecciones/)
    stub_request(:get, source).to_return(status: 302, headers: {"Location" => "http://techweek.cl/cover.png"})
    expect { uploader.call }.to raise_error(Luma::Error, /HTTPS/)
  end

  it "turns network timeouts into approval errors" do
    stub_request(:get, source).to_timeout
    expect { uploader.call }.to raise_error(Luma::Error, /descargar/)
  end
end
