# Props of /brand/icon (BrandController#icon → pages/Brand/Icon.tsx): the document metadata
# and where the static icon files live. Plain values, so Typelizer is told their types.
class BrandIconResource < ApplicationResource
  typelize title: :string, description: :string, size: :number,
    svg_path: :string, png_path: :string, download_name: :string
  attributes :title, :description, :size, :svg_path, :png_path, :download_name
end
