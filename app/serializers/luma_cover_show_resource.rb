class LumaCoverShowResource < ApplicationResource
  typelize title: :string, width: :number, height: :number,
    dates: :string, site: :string
  attributes :title, :width, :height, :dates, :site
end
