FactoryBot.define do
  # The known weeks already exist (spec/support/weeks.rb); this is for the odd spec that
  # needs another one, and for reaching an existing week by year.
  factory :week do
    year { 2027 }
    starts_on { Date.new(year, 11, 15) }
    ends_on { starts_on + 6 }

    initialize_with { Week.find_or_initialize_by(year: year) }
    to_create { |week| week.save! }
  end
end
