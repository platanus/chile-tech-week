# Props of the landing (HomeController#show → pages/Home/Show.tsx). Picked up by
# alba-inertia from the controller/action name; the controller's instance variables are
# the object. Plain strings, not columns, so Typelizer is told their types.
class HomeShowResource < ApplicationResource
  typelize title: :string, description: :string
  attributes :title, :description
end
