class PublicEventsShowResource < ApplicationResource
  typelize title: :string, description: :string, opengraph_image_url: :string
  attributes :title, :description, :opengraph_image_url

  one :event, resource: PublicEventResource
end
