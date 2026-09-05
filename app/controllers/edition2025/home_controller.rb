module Edition2025
  # /25 — the 2025 landing: the three-line wordmark, the participating companies' logos
  # and the FAQ.
  class HomeController < BaseController
    def show
      @logos = CompanyLogo.shown_for(EDITION)
    end
  end
end
