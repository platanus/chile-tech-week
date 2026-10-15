require "rails_helper"

RSpec.describe ErrorNotifier do
  subject(:notifier) { described_class.new(enabled: true, cache: ActiveSupport::Cache::MemoryStore.new) }

  let(:slack) { stub_request(:post, "https://slack.com/api/chat.postMessage").to_return(status: 200, body: {ok: true}.to_json) }

  before do
    allow(AppConfig).to receive(:instance).and_return(AppConfig.new(slack_bot_token: "xoxb-1", slack_channel: "C123"))
    slack
  end

  def raised(error)
    raise error
  rescue => e
    e
  end

  def report(error, **options)
    notifier.report(error, handled: true, severity: :warning, context: {}, source: "application", **options)
  end

  def posted_text
    text = nil
    expect(slack.with { |req| text = JSON.parse(req.body)["text"] }).to have_been_requested
    text
  end

  it "posts the error, its context and where it happened to Slack" do
    report(raised(Luma::Error.new("Luma API error (403) on /event/admin/get")), context: {event_id: "af19", job: nil})

    expect(posted_text).to include("Luma::Error", "(403) on /event/admin/get", "event_id: af19")
  end

  it "posts the same error once per window, whatever ids it names" do
    2.times { |i| report(raised(Luma::Error.new("sync failed for evt-#{i}abc (#{i}03)"))) }
    report(raised(ArgumentError.new("another one")))

    expect(slack).to have_been_requested.twice
  end

  it "is silent outside production and without Slack" do
    described_class.new(enabled: false).report(raised(RuntimeError.new("x")), handled: false, severity: :error, context: {})
    allow(AppConfig).to receive(:instance).and_return(AppConfig.new)
    report(raised(RuntimeError.new("y")))

    expect(slack).not_to have_been_requested
  end

  it "never raises into what it reports on" do
    allow(SlackNotifier).to receive(:post).and_raise(IOError)

    expect { report(raised(RuntimeError.new("x"))) }.not_to raise_error
  end

  it "hears what the code reports through Rails.error" do
    Rails.error.subscribe(notifier)
    Rails.error.report(raised(Luma::Error.new("boom")), context: {event_id: "e1"})

    expect(posted_text).to include("Luma::Error", "boom", "event_id: e1")
  ensure
    Rails.error.unsubscribe(notifier)
  end
end
