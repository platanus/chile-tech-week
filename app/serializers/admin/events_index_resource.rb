module Admin
  class EventsIndexResource < ApplicationResource
    typelize status: :string, search: :string
    attributes :status, :search
    has_many :events, resource: Admin::EventResource
    has_one :pagination, resource: Admin::PaginationResource
  end
end
