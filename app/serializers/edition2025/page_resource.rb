module Edition2025
  # The document metadata every 2025 page carries in its <Head>.
  class PageResource < ApplicationResource
    typelize title: :string, description: :string, opengraph_image: :string
    attributes :title, :description, :opengraph_image
  end
end
