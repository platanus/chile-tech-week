require "rails_helper"

RSpec.describe "GET /geocode" do
  let(:photon) { "#{AppConfig.instance.photon_url}/api" }
  let(:features) { {features: [{properties: {name: "Torre"}}]}.to_json }

  around do |example|
    original = Rails.cache
    Rails.cache = ActiveSupport::Cache::MemoryStore.new
    example.run
    Rails.cache = original
  end

  it "relays the search with the fixed Chile parameters and the bias it was given" do
    request = stub_request(:get, "#{photon}?q=soria+667&limit=8&countrycode=CL&lang=default&lat=-33.44&lon=-70.65&layer=house&layer=street")
      .to_return(body: features)

    get "/geocode", params: {q: "soria 667", lat: "-33.44", lon: "-70.65"}

    expect(response).to have_http_status(:ok)
    expect(response.media_type).to eq("application/json")
    expect(response.body).to eq(features)
    expect(request).to have_been_requested
  end

  it "ignores a bias that is not a number, and anything else the browser adds" do
    request = stub_request(:get, "#{photon}?q=soria&limit=8&countrycode=CL&lang=default&layer=house&layer=street")
      .to_return(body: features)

    get "/geocode", params: {q: "soria", lat: "x", lon: "1", limit: "500", layer: "city"}

    expect(request).to have_been_requested
  end

  it "answers the same search from the cache" do
    request = stub_request(:get, photon).with(query: hash_including(q: "soria")).to_return(body: features)

    2.times { get "/geocode", params: {q: "soria"} }

    expect(request).to have_been_requested.once
  end

  it "rejects a search that is too short or too long" do
    get "/geocode", params: {q: "so"}
    expect(response).to have_http_status(:bad_request)

    get "/geocode", params: {q: "a" * 121}
    expect(response).to have_http_status(:bad_request)
  end

  it "answers 502 when Photon is down, and caches nothing" do
    stub_request(:get, photon).with(query: hash_including(q: "soria")).to_return(status: 503).then.to_return(body: features)

    get "/geocode", params: {q: "soria"}
    expect(response).to have_http_status(:bad_gateway)

    get "/geocode", params: {q: "soria"}
    expect(response).to have_http_status(:ok)
  end
end
