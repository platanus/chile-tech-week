# /events/:id — the status page.
class EventsShowResource < ApplicationResource
  typelize title: :string, description: :string, open_publish: :boolean
  attributes :title, :description, :open_publish

  one :event, resource: EventStatusResource
end
