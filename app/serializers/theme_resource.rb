class ThemeResource < ApplicationResource
  typelize_from Theme
  attributes :id, :name, :slug
end
