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

FactoryBot.define do
  factory :user do
    sequence(:email) { |n| "admin#{n}@techweek.cl" }
    password { "secret-password" }
    first_name { "Ada" }
    last_name { "Lovelace" }
    role { "admin" }

    trait :notified do
      notifications_enabled_at { Time.current }
    end
  end

  factory :outbound_email do
    # The admin's log is scoped by the event each message is about (OutboundEmail.for_week),
    # so a message always has one; pass `event:` to put it in another week.
    transient { event { create(:event) } }

    template_name { "event_submitted" }
    template_data { {"event_id" => event.id} }
    to { "host@example.com" }
    subject { "Un asunto" }
    html_content { "<p>Hola</p>" }
    text_content { "Hola" }
    status { "sent" }
    sent_at { Time.current }
    external_message_id { "msg_123" }
  end

  factory :task_run do
    task_id { "sync-luma-events" }
    last_executed_at { Time.current }
    last_status { "success" }
    execution_count { 1 }
  end
end
