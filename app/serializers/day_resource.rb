# One day of the week (Week#days) with how many published events it already has.
class DayResource < ApplicationResource
  typelize date: :string, label: :string, count: :number
  attributes :date, :label, :count
end
