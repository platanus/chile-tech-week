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

    it "links the favicon set and serves it from public" do
      get "/"

      expect(response.body).to include(%(<link rel="icon" href="/favicon.ico?v=squircle-2026" sizes="48x48">))
      expect(response.body).to include(%(<link rel="icon" href="/icon.svg?v=squircle-2026" type="image/svg+xml">))
      expect(response.body).to include(%(<link rel="apple-touch-icon" href="/apple-touch-icon.png?v=squircle-2026">))

      ico = Rails.public_path.join("favicon.ico").binread
      expect(ico.byteslice(0, 4)).to eq("\x00\x00\x01\x00".b) # an ICO…
      expect(ico.byteslice(4, 2).unpack1("v")).to eq(3) # …with 16, 32 and 48
      png = Rails.public_path.join("apple-touch-icon.png").binread
      expect(png.byteslice(16, 8).unpack("N2")).to eq([180, 180])
      expect(Rails.public_path.join("icon.svg").read).to include(%(fill="#EE2B2B"))
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
