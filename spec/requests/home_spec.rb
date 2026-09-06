require "rails_helper"

RSpec.describe "the landing" do
  describe "GET /" do
    it "renders the landing page with its document metadata" do
      get "/"

      expect(response).to have_http_status(:ok)
      expect(inertia).to render_component("Home/Show")
      expect(inertia).to have_props(
        title: "Chile Tech Week 2026 · 16 al 22 de noviembre",
        description: HomeController::DESCRIPTION
      )
    end

    it "carries the 2026 share image, a 1200×630 PNG under public" do
      get "/"

      expect(response.body).to include(%(property="og:image" content="https://techweek.cl/opengraph.png"))
      expect(response.body).to include(%(name="twitter:card" content="summary_large_image"))
      png = Rails.public_path.join("opengraph.png").binread
      expect(png.byteslice(16, 8).unpack("N2")).to eq([1200, 630])
      expect(png.bytesize).to be < 100_000
    end

    it "preloads the terrain index and overview the scene needs before its first frame" do
      get "/"

      base = TerrainAssets.base
      expect(base).to match(%r{\A/terrain/cl-[0-9a-f]+\z})
      expect(response.body).to include(%(<link rel="preload" as="fetch" crossorigin href="#{base}/index.json">))
      expect(response.body).to include(%(<link rel="preload" as="fetch" crossorigin href="#{base}/overview.bin">))
      expect(Rails.public_path.join("terrain", File.basename(base), "index.json")).to exist
    end

    it "serves the terrain dataset the loader points at" do
      get "#{TerrainAssets.base}/index.json"

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body).to include("name" => "Chile", "tilesX" => 8)
    end
  end
end
