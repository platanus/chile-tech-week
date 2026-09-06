# /events/new: the catalogue the form picks from and the week it must fall in.
class EventsNewResource < ApplicationResource
  typelize title: :string, description: :string, week: "{ from: string; to: string }",
    communes: "string[]", formats: "EventFormat[]", description_limit: :number
  attributes :title, :description, :week, :communes, :formats, :description_limit

  has_many :days, resource: DayResource
  has_many :themes, resource: ThemeResource
  has_many :audiences, resource: AudienceResource
end
