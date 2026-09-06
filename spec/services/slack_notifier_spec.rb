require "rails_helper"

RSpec.describe SlackNotifier do
  let(:event) { create(:event, title: "Demo Day", author_name: "Ada", company_name: "Fintual") }

  it "does nothing without a token and a channel" do
    expect(described_class.new_submission(event)).to be(false)
  end

  it "posts the submission to the channel as the bot" do
    allow(AppConfig).to receive(:instance).and_return(AppConfig.new(slack_bot_token: "xoxb-1", slack_channel: "C123", site_url: "https://techweek.cl"))
    request = stub_request(:post, "https://slack.com/api/chat.postMessage").with(headers: {"Authorization" => "Bearer xoxb-1"}).to_return(status: 200, body: {ok: true}.to_json)

    expect(described_class.new_submission(event)).to be(true)
    expect(request.with { |req| JSON.parse(req.body)["channel"] == "C123" && JSON.parse(req.body)["text"].include?("Demo Day") && JSON.parse(req.body)["text"].include?("https://techweek.cl/admin/25/events/#{event.id}") }).to have_been_requested
  end

  it "swallows failures" do
    allow(AppConfig).to receive(:instance).and_return(AppConfig.new(slack_bot_token: "xoxb-1", slack_channel: "C123"))
    stub_request(:post, "https://slack.com/api/chat.postMessage").to_timeout

    expect(described_class.new_submission(event)).to be(false)
  end
end
