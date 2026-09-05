FactoryBot.define do
  factory :event do
    edition { 2025 }
    author_email { Faker::Internet.email }
    author_name { Faker::Name.name }
    author_phone_number { "+56 9 1234 5678" }
    company_name { Faker::Company.name }
    company_website { "https://example.com" }
    company_logo_url { "https://example.com/logo.png" }
    sequence(:title) { |n| "Event #{n}" }
    description { "An event." }
    starts_at { Time.zone.local(2025, 11, 18, 18, 0) }
    ends_at { starts_at + 2.hours }
    commune { "Providencia" }
    format { "networking" }
    state { "submitted" }

    trait :published do
      state { "published" }
      approved_at { Time.zone.local(2025, 10, 1) }
      published_at { Time.zone.local(2025, 10, 2) }
      luma_event_url { "https://luma.com/example" }
    end

    trait :logo_shown do
      logo_shown_at { Time.zone.local(2025, 10, 3) }
    end
  end

  factory :cohost do
    event
    company_name { Faker::Company.name }
    company_logo_url { "https://example.com/cohost.png" }
    primary_contact_name { Faker::Name.name }
    primary_contact_email { Faker::Internet.email }
  end

  factory :theme do
    sequence(:name) { |n| "Theme #{n}" }
    slug { name.parameterize }
  end

  factory :audience do
    sequence(:name) { |n| "Audience #{n}" }
    slug { name.parameterize }
  end
end
