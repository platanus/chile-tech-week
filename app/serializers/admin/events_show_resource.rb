module Admin
  class EventsShowResource < ApplicationResource
    typelize communes: "string[]"
    attributes :communes
    has_one :event, resource: Admin::EventResource
  end
end
