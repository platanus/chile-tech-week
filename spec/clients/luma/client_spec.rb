require "rails_helper"

RSpec.describe Luma::Client do
  subject(:client) { described_class.new("luma-key") }

  it "creates an event and returns its api id and url" do
    request = stub_request(:post, "https://public-api.luma.com/v1/event/create")
      .with(headers: {"x-luma-api-key" => "luma-key", "Content-Type" => "application/json"})
      .to_return(status: 200, body: {api_id: "evt-1", name: "Demo", start_at: "2026-11-18T21:00:00Z", end_at: "2026-11-18T23:00:00Z", url: "https://luma.com/x1", visibility: "private"}.to_json)

    event = client.create_event(name: "Demo", start_at: "2026-11-18T21:00:00Z", end_at: "2026-11-18T23:00:00Z", visibility: "private", cover_url: nil)

    expect(event).to have_attributes(api_id: "evt-1", url: "https://luma.com/x1", visibility: "private")
    expect(request.with { |req| JSON.parse(req.body) == {"name" => "Demo", "start_at" => "2026-11-18T21:00:00Z", "end_at" => "2026-11-18T23:00:00Z", "visibility" => "private"} }).to have_been_requested
  end

  it "uploads bytes to the signed URL without disclosing the API key" do
    stub_request(:post, "https://public-api.luma.com/v1/images/create-upload-url")
      .with(body: {content_type: "image/png"}.to_json, headers: {"x-luma-api-key" => "luma-key"})
      .to_return(body: {upload_url: "https://storage.example/cover?signature=secret", file_url: "https://images.lumacdn.com/cover.png"}.to_json)
    upload = stub_request(:put, "https://storage.example/cover?signature=secret")
      .with(body: "png-bytes", headers: {"Content-Type" => "image/png"}) { |request| !request.headers.key?("X-Luma-Api-Key") }
      .to_return(status: 200, body: "")
    expect(client.upload_image(body: "png-bytes", content_type: "image/png")).to eq("https://images.lumacdn.com/cover.png")
    expect(upload).to have_been_requested
  end

  it "does not expose signed storage credentials when an upload fails" do
    stub_request(:post, "https://public-api.luma.com/v1/images/create-upload-url")
      .to_return(body: {upload_url: "https://storage.example/cover?signature=secret", file_url: "https://images.lumacdn.com/cover.png"}.to_json)
    stub_request(:put, "https://storage.example/cover?signature=secret").to_return(status: 403, body: "signature=secret")
    expect { client.upload_image(body: "png", content_type: "image/png") }.to raise_error(Luma::Error) { |error|
      expect(error.message).to include("403")
      expect(error.message).not_to include("secret")
    }
  end

  it "rejects malformed upload responses" do
    stub_request(:post, "https://public-api.luma.com/v1/images/create-upload-url").to_return(body: "{}")
    expect { client.upload_image(body: "png", content_type: "image/png") }.to raise_error(Luma::Error, /inválida/)
  end

  it "reads an event" do
    stub_request(:get, "https://public-api.luma.com/v1/event/get?api_id=evt-1")
      .to_return(status: 200, body: {event: {api_id: "evt-1", name: "Demo", start_at: "2026-11-18T21:00:00Z", end_at: "2026-11-18T23:00:00Z", url: "https://luma.com/x1"}}.to_json)

    expect(client.get_event("evt-1").name).to eq("Demo")
  end

  it "adds a host and updates visibility" do
    add = stub_request(:post, "https://public-api.luma.com/v1/event/add-host").with(body: {event_api_id: "evt-1", email: "ada@example.com"}.to_json).to_return(status: 200, body: "{}")
    update = stub_request(:post, "https://public-api.luma.com/v1/event/update").with(body: {event_api_id: "evt-1", visibility: "public"}.to_json).to_return(status: 200, body: "{}")

    client.add_host("evt-1", "ada@example.com")
    client.update_event("evt-1", visibility: "public")

    expect(add).to have_been_requested
    expect(update).to have_been_requested
  end

  it "reads Markdown from an unwrapped event response, including an empty body" do
    stub_request(:get, "https://public-api.luma.com/v1/event/get?api_id=evt-1")
      .to_return(status: 200, body: {api_id: "evt-1", description_md: "## Agenda\n\n**Demo**"}.to_json)
      .then.to_return(status: 200, body: {api_id: "evt-1", description_md: ""}.to_json)

    expect(client.get_event("evt-1").description_md).to eq("## Agenda\n\n**Demo**")
    expect(client.get_event("evt-1").description_md).to eq("")
  end

  it "raises Luma::NotFound with the cancellation on a 404, Luma::Error otherwise" do
    stub_request(:get, "https://public-api.luma.com/v1/event/get?api_id=gone").to_return(status: 404, body: "event was canceled")
    stub_request(:get, "https://public-api.luma.com/v1/event/get?api_id=bad").to_return(status: 500, body: "boom")

    expect { client.get_event("gone") }.to raise_error(Luma::NotFound) { |e| expect(e).to be_canceled }
    expect { client.get_event("bad") }.to raise_error(Luma::Error, /500.*boom/)
  end

  it "refuses to start without a key, and Luma.client falls back to the fake" do
    expect { described_class.new("") }.to raise_error(Luma::Error)
    expect(Luma.client).to be_a(Luma::FakeClient)
  end
end
