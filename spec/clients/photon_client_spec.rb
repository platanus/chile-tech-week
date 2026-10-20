require "rails_helper"

RSpec.describe PhotonClient do
  subject(:client) { described_class.new(url: "http://photon:2322") }

  it "searches /api with the pairs it is given, layers repeating" do
    request = stub_request(:get, "http://photon:2322/api?q=soria+667&layer=house&layer=street")
      .with(headers: {"User-Agent" => "techweek.cl"})
      .to_return(body: {features: []}.to_json)

    expect(client.search([["q", "soria 667"], ["layer", "house"], ["layer", "street"]])).to eq({features: []}.to_json)
    expect(request).to have_been_requested
  end

  it "raises Error on a failing answer" do
    stub_request(:get, "http://photon:2322/api").with(query: {q: "x"}).to_return(status: 503)

    expect { client.search([["q", "x"]]) }.to raise_error(described_class::Error, /503/)
  end

  it "raises Error when Photon is unreachable" do
    stub_request(:get, "http://photon:2322/api").with(query: {q: "x"}).to_raise(Errno::ECONNREFUSED)

    expect { client.search([["q", "x"]]) }.to raise_error(described_class::Error, /failed/)
  end
end
