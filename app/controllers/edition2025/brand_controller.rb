module Edition2025
  # /25/brand — the 2025 brand kit: font, colours and the logo files under public/25/brand.
  class BrandController < BaseController
    def show
      @title = "Brand Kit · #{TITLE}"
    end
  end
end
