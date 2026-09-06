# Props of /brand (BrandController#show → pages/Brand/Show.tsx): the document metadata. The
# kit itself is content, in app/frontend/brand/kit.ts.
class BrandShowResource < ApplicationResource
  typelize title: :string, description: :string
  attributes :title, :description
end
