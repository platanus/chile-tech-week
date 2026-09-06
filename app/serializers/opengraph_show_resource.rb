# Props of /opengraph (OpengraphController#show → pages/Opengraph/Show.tsx): the stage size
# and the copy on it.
class OpengraphShowResource < ApplicationResource
  typelize title: :string, width: :number, height: :number,
    dates: :string, site: :string
  attributes :title, :width, :height, :dates, :site
end
