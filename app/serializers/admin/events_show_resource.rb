module Admin
  # One event and everything the edit form picks from: the communes, the formats and the
  # whole theme/audience catalogue.
  class EventsShowResource < ApplicationResource
    typelize communes: "string[]", formats: "EventFormat[]"
    attributes :communes, :formats
    has_one :event, resource: Admin::EventResource
    has_many :themes, resource: ThemeResource
    has_many :audiences, resource: AudienceResource
  end
end
