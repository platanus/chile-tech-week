module Admin
  # A co-host with its contact details — the admin's side, unlike CohostResource.
  class CohostResource < ApplicationResource
    typelize_from Cohost
    attributes :id, :company_name, :company_logo_url, :primary_contact_name, :primary_contact_email,
      :primary_contact_phone_number, :primary_contact_website, :primary_contact_linkedin, :logo_shown_at, :created_at
  end
end
