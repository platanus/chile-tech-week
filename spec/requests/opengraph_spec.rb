require "rails_helper"

RSpec.describe "the OpenGraph stage" do
  it "renders the 1200×630 stage with the dates" do
    get "/opengraph"

    expect(response).to have_http_status(:ok)
    expect(inertia).to render_component("Opengraph/Show")
    expect(inertia).to have_props(width: 1200, height: 630, dates: "16 — 22 nov", site: "techweek.cl")
  end
end
