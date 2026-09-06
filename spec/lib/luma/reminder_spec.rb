require "rails_helper"

RSpec.describe Luma::Reminder do
  include ActiveJob::TestHelper

  it "reminds the hosts waiting for more than a day, with how many days" do
    now = Time.zone.local(2026, 10, 10, 10)
    stale = create(:event, state: "waiting_luma_edit", luma_event_url: "https://luma.com/a", waiting_luma_edit_at: now - 3.days - 1.hour)
    create(:event, state: "waiting_luma_edit", luma_event_url: "https://luma.com/b", waiting_luma_edit_at: now - 2.hours)
    create(:event, state: "waiting_luma_edit", luma_event_url: nil, waiting_luma_edit_at: now - 5.days)
    create(:event, :published, waiting_luma_edit_at: now - 5.days)

    expect { expect(described_class.new(now: now).call).to eq(1) }
      .to have_enqueued_mail(EventMailer, :luma_reminder).with(params: {event: stale, days_waiting: 3}, args: [])
  end
end
