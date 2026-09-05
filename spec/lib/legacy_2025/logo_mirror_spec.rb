require "rails_helper"

RSpec.describe Legacy2025::LogoMirror do
  let(:directory) { Rails.root.join("tmp/spec-logos-#{ENV.fetch("TEST_ENV_NUMBER", "")}") }
  let(:host_logo) { "https://#{described_class::BLOB_HOST}/public-uploads/1759252436338-etmday-logo-j90Yq34.png" }
  let(:cohost_logo) { "https://#{described_class::BLOB_HOST}/public-uploads/1762346674892-LOGO%20BCI.png" }

  before { directory.rmtree if directory.exist? }
  after { directory.rmtree if directory.exist? }

  it "downloads each Vercel Blob logo once and points the 2025 rows at the local copy" do
    stub_request(:get, host_logo).to_return(status: 200, body: "PNG-etm")
    stub_request(:get, cohost_logo).to_return(status: 200, body: "PNG-bci")
    event = create(:event, edition: 2025, company_logo_url: host_logo)
    twin = create(:event, edition: 2025, company_logo_url: host_logo)
    cohost = create(:cohost, event: event, company_logo_url: cohost_logo)
    elsewhere = create(:event, edition: 2025, company_logo_url: "https://example.com/own-cdn.png")
    other_edition = create(:event, edition: 2026, company_logo_url: host_logo)

    count = described_class.new(directory: directory).run

    expect(count).to eq(2)
    expect(directory.join("1759252436338-etmday-logo-j90Yq34.png").read).to eq("PNG-etm")
    expect(directory.join("1762346674892-LOGO-20BCI.png").read).to eq("PNG-bci")
    expect(event.reload.company_logo_url).to eq("/25/logos/1759252436338-etmday-logo-j90Yq34.png")
    expect(twin.reload.company_logo_url).to eq("/25/logos/1759252436338-etmday-logo-j90Yq34.png")
    expect(cohost.reload.company_logo_url).to eq("/25/logos/1762346674892-LOGO-20BCI.png")
    expect(elsewhere.reload.company_logo_url).to eq("https://example.com/own-cdn.png")
    expect(other_edition.reload.company_logo_url).to eq(host_logo)
    expect(a_request(:get, host_logo)).to have_been_made.once
  end

  it "keeps a logo already on disk instead of downloading it again" do
    directory.mkpath
    directory.join("1759252436338-etmday-logo-j90Yq34.png").write("already here")
    event = create(:event, edition: 2025, company_logo_url: host_logo)

    described_class.new(directory: directory).run

    expect(event.reload.company_logo_url).to eq("/25/logos/1759252436338-etmday-logo-j90Yq34.png")
    expect(a_request(:get, host_logo)).not_to have_been_made
  end

  it "stops on a logo the old storage no longer serves" do
    stub_request(:get, host_logo).to_return(status: 404)
    create(:event, edition: 2025, company_logo_url: host_logo)

    expect { described_class.new(directory: directory).run }.to raise_error(/HTTP 404/)
  end
end
