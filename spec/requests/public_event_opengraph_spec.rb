require "rails_helper"

RSpec.describe "event OpenGraph images" do
  it "serves the PNG, supports conditional requests, and refreshes after edits" do
    event = create(:event, :published)
    path = public_event_opengraph_path(slug: event.slug)
    get path
    expect(response).to have_http_status(:ok)
    expect(response.media_type).to eq("image/png")
    expect(response.body.b).to start_with("\x89PNG".b)
    etag = response.headers["ETag"]
    get path, headers: {"If-None-Match" => etag}
    expect(response).to have_http_status(:not_modified)
    event.update!(title: "New title")
    get path, headers: {"If-None-Match" => etag}
    expect(response).to have_http_status(:ok)
    expect(response.headers["ETag"]).not_to eq(etag)
  end

  it "hides unpublished events and unknown slugs" do
    event = create(:event)
    get public_event_opengraph_path(slug: event.slug)
    expect(response).to have_http_status(:not_found)
    get "/unknown-event/opengraph"
    expect(response).to have_http_status(:not_found)
  end

  it "includes the versioned image URL in the initial event HTML" do
    event = create(:event, :published)
    get public_event_path(slug: event.slug)
    document = Nokogiri::HTML(response.body)
    expect(document.at_css('meta[property="og:image"]')["content"]).to include("/#{event.slug}/opengraph?v=")
    expect(document.at_css('meta[name="twitter:image"]')["content"]).to include("/#{event.slug}/opengraph?v=")
  end
end
