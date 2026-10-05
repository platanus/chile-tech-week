require "rails_helper"

RSpec.describe WhatsappNotifier do
  let(:event) do
    create(:event, title: "Demo Day", author_name: "Ada", company_name: "Fintual", address: "Av. Apoquindo 3000",
      commune: "Las Condes", company_logo_url: "https://example.com/logo.png")
  end
  let(:config) do
    AppConfig.new(wpp_api_url: "https://wpp.example", wpp_api_key: "wpp_abc_secret", wpp_chat_jid: "123@g.us",
      site_url: "https://techweek.cl")
  end
  let(:endpoint) { "https://wpp.example/api/v1/messages" }

  it "does nothing without a key and a chat" do
    expect(described_class.new_submission(event, config: AppConfig.new)).to be(false)
  end

  it "sends the summary and the admin link to the group, with the logo URL" do
    create(:event, state: "rejected")
    request = stub_request(:post, endpoint)
      .with(headers: {"Authorization" => "Bearer wpp_abc_secret", "Idempotency-Key" => "techweek-submitted-#{event.id}"})
      .to_return(status: 202, body: {id: 1, status: "queued"}.to_json)

    described_class.new_submission(event, config: config)

    expect(request.with { |req|
      body = JSON.parse(req.body)
      body["to"] == "123@g.us" && body["file"] == {"url" => "https://example.com/logo.png", "kind" => "image"} &&
        body["text"].include?("*Demo Day*") && body["text"].include?("Av. Apoquindo 3000, Las Condes") && body["text"].match?(/Cuándo: \S+ \d+ de \S+, \d\d:\d\d – \d\d:\d\d\n/) &&
        body["text"].include?("https://techweek.cl/admin/25/events/#{event.id}") &&
        body["text"].end_with?("Total de eventos enviados 2025: 2")
    }).to have_been_requested
  end

  it "sends an uploaded logo as bytes" do
    event.logo.attach(io: file_fixture("logo.png").open, filename: "logo.png", content_type: "image/png")
    request = stub_request(:post, endpoint).to_return(status: 202, body: {id: 1}.to_json)

    described_class.new_submission(event, config: config)

    expect(request.with { |req|
      file = JSON.parse(req.body)["file"]
      file["filename"] == "logo.png" && Base64.strict_decode64(file["data"]) == file_fixture("logo.png").binread
    }).to have_been_requested
  end

  it "raises on a failed request so the job retries" do
    stub_request(:post, endpoint).to_return(status: 503, body: {error: "down"}.to_json)

    expect { described_class.new_submission(event, config: config) }.to raise_error(WppClient::Error, /503/)
  end
end
