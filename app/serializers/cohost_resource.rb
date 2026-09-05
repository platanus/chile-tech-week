# A co-hosting company, public side only (see EventResource).
class CohostResource < ApplicationResource
  typelize_from Cohost
  attributes :id, :company_name, :company_logo_url
end
