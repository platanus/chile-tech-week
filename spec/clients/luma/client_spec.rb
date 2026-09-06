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
