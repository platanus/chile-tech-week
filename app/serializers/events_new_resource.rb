# /events/new: the catalogue the form picks from and the week it must fall in.
class EventsNewResource < ApplicationResource
  typelize title: :string, description: :string, week_dates: "{ from: string; to: string }",
    formats: "EventFormat[]", description_limit: :number,
    # Development only (EventsController#prefill_from_url); null elsewhere. Keys are the
    # form's own param names: `company_name`, `starts_at`, `theme_ids`…
    prefill: "EventPrefill | null",
    step: "number | null"
  attributes :title, :description, :week_dates, :formats, :description_limit, :prefill, :step

  has_many :days, resource: DayResource
  has_many :themes, resource: ThemeResource
  has_many :audiences, resource: AudienceResource
end
