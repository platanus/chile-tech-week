require "rails_helper"

RSpec.describe "the 2026 brand" do
  describe "GET /brand" do
    it "renders the brand kit" do
      get "/brand"

      expect(response).to have_http_status(:ok)
      expect(inertia).to render_component("Brand/Show")
      expect(inertia).to have_props(title: "Marca · Chile Tech Week 2026")
    end

    it "carries the share tags from the server, with absolute URLs" do
      get "/brand"

      expect(response.body).to include(%(<link rel="canonical" href="https://techweek.cl/brand">))
      expect(response.body).to include(%(property="og:image" content="https://techweek.cl/opengraph.png"))
      expect(response.body).to include(%(property="og:title" content="Marca · Chile Tech Week 2026"))
      expect(response.body).to include(%(name="twitter:card" content="summary_large_image"))
    end

    it "keeps the share tags when SSR renders the page's own head, without a second title" do
      allow_any_instance_of(InertiaRails::Helper).to receive(:inertia_ssr_head).and_return(%(<title inertia>SSR</title>).html_safe)

      get "/brand"

      expect(response.body.scan("<title").size).to eq(1)
      expect(response.body).to include(%(property="og:image" content="https://techweek.cl/opengraph.png"))
      expect(response.body).to include(%(name="twitter:image" content="https://techweek.cl/opengraph.png"))
      expect(response.body).not_to include(%(<meta name="description"))
    end

    it "serves every mark in its three variants, as PNG and as outlined SVG" do
      %w[logo logo-horizontal icon].product(["", "-transparent", "-light"]) do |mark, variant|
        get "/brand/#{mark}#{variant}.svg"
        expect(response).to have_http_status(:ok), "#{mark}#{variant}.svg"
        expect(response.body).to include(%(fill="#EE2B2B"))
        expect(response.body).not_to include("<text")
        expect(response.body).not_to include("font-family")
        # the default variant is on black; the other two leave the background open (the hollow
        # digits' mask has a rect of its own, so look for the black one)
        expect(response.body.match?(%r{<rect [^>]*fill="#000"/>})).to eq(variant.empty?), "#{mark}#{variant}.svg background"

        get "/brand/#{mark}#{variant}.png"
        expect(response).to have_http_status(:ok), "#{mark}#{variant}.png"
        expect(response.body.byteslice(0, 8)).to eq("\x89PNG\r\n\x1A\n".b)
      end
    end
  end

  it "serves the animated logo as a looping GIF and an MP4" do
    get "/brand/logo-animation.gif"
    expect(response).to have_http_status(:ok)
    expect(response.body.byteslice(0, 6)).to eq("GIF89a")
    expect(response.body).to include("NETSCAPE2.0") # the loop extension

    get "/brand/logo-animation.mp4"
    expect(response).to have_http_status(:ok)
    expect(response.body.byteslice(4, 4)).to eq("ftyp")
  end

  describe "GET /brand/icon" do
    it "renders the icon page pointing at the static files" do
      get "/brand/icon"

      expect(response).to have_http_status(:ok)
      expect(inertia).to render_component("Brand/Icon")
      expect(inertia).to have_props(
        title: "Ícono 2026 · Chile Tech Week",
        size: 1024,
        svgPath: "/brand/icon.svg",
        pngPath: "/brand/icon.png",
        downloadName: "chile-tech-week-2026-icon"
      )
    end

    it "serves the icon at its size" do
      get BrandController::ICON_SVG
      expect(response.body).to include(%(viewBox="0 0 1024 1024"))

      get BrandController::ICON_PNG
      # IHDR: width and height, big-endian, right after the signature and chunk header
      expect(response.body.byteslice(16, 8).unpack("N2")).to eq([1024, 1024])
    end
  end

  describe "GET /brand/wireframe-gen" do
    it "renders the generator" do
      get "/brand/wireframe-gen?f=strip&seed=3"

      expect(response).to have_http_status(:ok)
      expect(inertia).to render_component("Brand/Wireframe")
      expect(inertia).to have_props(title: "Wireframe · Chile Tech Week 2026")
    end
  end
end
