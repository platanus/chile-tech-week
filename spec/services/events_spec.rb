require "rails_helper"

RSpec.describe "the moderation services" do
  include ActiveJob::TestHelper

  let(:client) { Luma::FakeClient.instance }
  let(:event) { create(:event, edition: 2026, state: "submitted", author_email: "ada@example.com") }

  before { client.reset! }

  describe Events::Approve do
    it "creates the Luma event, moves the event to waiting_luma_edit and mails the host" do
      result = nil
      expect { result = described_class.new(event).call }.to have_enqueued_mail(EventMailer, :approved).with(params: {event: event}, args: [])

      expect(result.ok).to be(true)
      expect(event.reload).to have_attributes(state: "waiting_luma_edit")
      expect(event.approved_at).to be_present
      expect(event.waiting_luma_edit_at).to be_present
      expect(event.luma_event_api_id).to start_with("evt-fake-")
      expect(event.luma_event_url).to start_with("https://luma.com/fake-")
      expect(event.luma_event_created_at).to be_present
    end

    it "reports a Luma failure without touching the event" do
      allow(client).to receive(:create_event).and_raise(Luma::Error, "quota")

      result = described_class.new(event).call

      expect(result.ok).to be(false)
      expect(result.error).to include("quota")
      expect(event.reload.state).to eq("submitted")
    end
  end

  describe Events::Reject do
    it "rejects with the reason and mails the host" do
      expect { described_class.new(event, reason: " Falta la dirección ").call }.to have_enqueued_mail(EventMailer, :rejected)

      expect(event.reload).to have_attributes(state: "rejected", rejection_reason: "Falta la dirección", approved_at: nil)
      expect(event.rejected_at).to be_present
    end
  end

  describe Events::Publish do
    it "makes the Luma event public, publishes and mails the host" do
      luma = client.create_event(name: "x", start_at: "2026-11-18T21:00:00Z", end_at: "2026-11-18T23:00:00Z", visibility: "private")
      event.update!(state: "waiting_luma_edit", luma_event_api_id: luma.api_id, luma_event_url: luma.url)

      result = nil
      expect { result = described_class.new(event).call }.to have_enqueued_mail(EventMailer, :published)

      expect(result.ok).to be(true)
      expect(event.reload.state).to eq("published")
      expect(event.published_at).to be_present
      expect(client.get_event(luma.api_id).visibility).to eq("public")
    end

    it "refuses an event that is not waiting for its Luma edit" do
      result = described_class.new(event).call

      expect(result.ok).to be(false)
      expect(result.error).to include("no está listo")
      expect(event.reload.state).to eq("submitted")
    end
  end

  describe EventNotifications do
    it "mails the host and the admins that asked, and posts to Slack" do
      notified = create(:user, :notified, email: "mod@techweek.cl")
      create(:user, email: "quiet@techweek.cl")
      allow(SlackNotifier).to receive(:new_submission)

      expect { described_class.submitted(event) }
        .to have_enqueued_mail(EventMailer, :submitted).with(params: {event: event}, args: [])
        .and have_enqueued_mail(EventMailer, :new_submission).with(params: {event: event, user: notified}, args: [])
      expect(SlackNotifier).to have_received(:new_submission).with(event)
    end
  end
end
