module Admin
  # The whole row: what the moderators see, contact details and Luma fields included.
  class EventResource < ApplicationResource
    typelize_from Event
    attributes :id, :public_id, :edition, :title, :description, :author_name, :author_email, :author_phone_number,
      :company_name, :company_website, :company_logo_url, :starts_at, :ends_at, :commune, :format, :capacity,
      :latitude, :longitude, :state, :custom_url, :luma_event_api_id, :luma_event_url, :luma_event_created_at,
      :submitted_at, :approved_at, :rejected_at, :rejection_reason, :waiting_luma_edit_at, :published_at,
      :deleted_at, :logo_shown_at, :luma_cover_url, :created_at, :updated_at

    # What the site shows, and whether it is our own copy or still Luma's URL.
    typelize :string?
    attribute :cover_image_url, &:cover_image_url
    typelize :boolean
    attribute :cover_mirrored do |event|
      event.cover.attached?
    end

    has_many :themes, resource: ThemeResource
    has_many :audiences, resource: AudienceResource
    has_many :cohosts, resource: Admin::CohostResource
  end
end
