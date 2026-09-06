# An event as its own host sees it on the status page: the public fields plus where it is
# in the review. Still nothing private — the page's URL is what the host receives by email.
class EventStatusResource < EventResource
  typelize_from Event

  attributes :state, :rejection_reason, :luma_event_url, :published_at

  typelize :number
  attribute :step, &:step
end
