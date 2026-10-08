require "rails_helper"

RSpec.describe Luma::Import do
  let(:client) { Luma::FakeClient.instance }
  let(:week) { Week.find_by!(year: 2026) }
  let(:config) { AppConfig.new(luma_host_user_id: "usr-site") }

  before { client.reset! }

  # An event the host made on Luma: public, with the site's account among its hosts.
  def host_event(visibility: "public", start_at: "2026-11-18T21:00:00Z", hosts: [{"id" => "usr-site", "name" => "Chile Tech Week"}], **attributes)
    luma = client.create_event(name: "Demo Day", start_at: start_at, end_at: "2026-11-18T23:00:00Z", visibility: visibility,
      description_md: "## Agenda\n\nDoce **startups** presentan. [Más info](https://x.cl)", **attributes)
    client.events[luma.api_id] = luma.with(hosts: hosts)
  end

  def import(url, **options)
    described_class.new(url, week: week, client: client, config: config, **options).call
  end

  it "takes a public event inside the week that has the site's account as a host" do
    luma = host_event

    result = import(luma.url)

    expect(result).to be_ok
    expect(result.event.api_id).to eq(luma.api_id)
  end

  it "accepts the link in any of its usual shapes" do
    luma = host_event
    slug = luma.url.split("/").last

    [luma.url, "luma.com/#{slug}", "https://lu.ma/#{slug}?tk=abc", slug].each do |link|
      expect(import(link)).to be_ok, link
    end
  end

  it "fills the form's own fields from the Luma event" do
    luma = host_event

    expect(import(luma.url).prefill).to eq(
      title: "Demo Day", description: "Agenda Doce startups presentan. Más info",
      starts_at: "2026-11-18T18:00", ends_at: "2026-11-18T20:00"
    )
  end

  it "cuts the description to the programme's limit" do
    luma = host_event(description_md: "palabra " * 100)

    expect(import(luma.url).prefill[:description].length).to be <= Event::DESCRIPTION_LIMIT
  end

  {
    "text that is not a link" => [:invalid_link, "no soy un link"],
    "a link that is not Luma's" => [:invalid_link, "https://example.com/evento"],
    "an event Luma does not have" => [:not_found, "https://luma.com/nadie"]
  }.each do |name, (error, link)|
    it "refuses #{name}" do
      expect(import(link)).to have_attributes(error: error, event: nil)
    end
  end

  it "refuses a private event" do
    expect(import(host_event(visibility: "private").url).error).to eq(:private)
  end

  it "refuses an event cancelled on Luma" do
    luma = host_event
    client.cancel(luma.api_id)

    expect(import(luma.url).error).to eq(:cancelled)
  end

  it "refuses an event outside the week" do
    expect(import(host_event(start_at: "2026-12-10T21:00:00Z").url).error).to eq(:outside_week)
  end

  it "refuses an event that is already registered, unless that submission was rejected" do
    luma = host_event
    create(:event, edition: 2026, state: "submitted", luma_event_api_id: luma.api_id)
    expect(import(luma.url).error).to eq(:already_registered)

    Event.find_by!(luma_event_api_id: luma.api_id).update!(state: "rejected")
    expect(import(luma.url)).to be_ok
  end

  it "refuses an event whose hosts do not include the site's account" do
    luma = host_event(hosts: [{"id" => "usr-someone", "name" => "Someone"}])

    expect(import(luma.url).error).to eq(:not_host)
  end

  it "skips the host check when no account is configured" do
    luma = host_event(hosts: [])

    expect(described_class.new(luma.url, week: week, client: client, config: AppConfig.new(luma_host_user_id: "")).call).to be_ok
  end

  it "reports Luma being down instead of raising" do
    allow(client).to receive(:lookup_event_id).and_raise(Luma::Error, "timeout")

    expect(import("https://luma.com/abc").error).to eq(:unavailable)
  end
end
