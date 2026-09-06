# A published event as the public pages see it. Only the public side of the row: the
# submitter's contact details (author_*, cohost primary_contact_*) never leave the server.
class EventResource < ApplicationResource
  typelize_from Event

  attributes :id, :title, :description, :company_name, :company_website, :company_logo_url,
    :starts_at, :ends_at, :commune, :format, :capacity

  typelize :string?
  attribute :registration_url, &:registration_url

  # The event's picture: our mirror of the Luma cover, else Luma's own URL (see
  # Event#cover_image_url). Nil until the event has a Luma event.
  typelize :string?
  attribute :cover_image_url, &:cover_image_url

  has_many :themes, resource: ThemeResource
  has_many :audiences, resource: AudienceResource
  has_many :cohosts, resource: CohostResource
end
