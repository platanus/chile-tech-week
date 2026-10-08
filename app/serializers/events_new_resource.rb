# /events/new: the catalogue the form picks from and the week it must fall in.
class EventsNewResource < ApplicationResource
  typelize title: :string, description: :string, week_dates: "{ from: string; to: string }",
    formats: "EventFormat[]", description_limit: :number,
    # Development only (EventsController#prefill_from_url); null elsewhere. Keys are the
    # form's own param names: `company_name`, `starts_at`, `theme_ids`…
    prefill: "EventPrefill | null",
    step: "number | null",
    # The Luma link the host pasted (?luma=…): what to show and, once it checks out, the event.
    luma: "LumaImport | null", luma_host_email: :string
  attributes :title, :description, :week_dates, :formats, :description_limit, :prefill, :step, :luma, :luma_host_email

  has_many :days, resource: DayResource
  has_many :themes, resource: ThemeResource
  has_many :audiences, resource: AudienceResource
end
