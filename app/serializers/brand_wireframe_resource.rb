# Props of /brand/wireframe-gen (BrandController#wireframe → pages/Brand/Wireframe.tsx): the
# document metadata; the generator's settings travel in the query string.
class BrandWireframeResource < ApplicationResource
  typelize title: :string, description: :string
  attributes :title, :description
end
