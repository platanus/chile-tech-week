module Admin
  class OutboundEmailsIndexResource < ApplicationResource
    typelize search: :string
    attributes :search
    has_one :stats, resource: Admin::EmailStatsResource
    has_many :emails, resource: Admin::OutboundEmailResource
    has_one :pagination, resource: Admin::PaginationResource
  end
end
