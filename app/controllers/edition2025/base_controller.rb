module Edition2025
  # The 2025 edition's pages share one identity: the old site's title and description, its
  # OpenGraph card and its neo-brutalist React layout (pages/Edition2025/*).
  class BaseController < InertiaController
    EDITION = 2025
    TITLE = "Chile Tech Week 2025".freeze
    DESCRIPTION = "The decentralized Tech Week in Chile. November 17-23, 2025.".freeze
    OPENGRAPH_IMAGE = "/25/opengraph.png".freeze

    before_action :set_edition_meta

    private

    def set_edition_meta
      @title = TITLE
      @description = DESCRIPTION
      @opengraph_image = OPENGRAPH_IMAGE
    end
  end
end
