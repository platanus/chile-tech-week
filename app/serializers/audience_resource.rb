class AudienceResource < ApplicationResource
  typelize_from Audience
  attributes :id, :name, :slug
end
