require "rails_helper"

RSpec.describe OutboundEmail::Delivery do
  let(:event) { create(:event, author_email: "host@example.com", title: "Demo Day") }

  def configured(**overrides)
    AppConfig.new(send_emails: false, resend_api_key: "", email_catch_all: "", email_from: "Chile Tech Week <hola@techweek.cl>", email_reply_to: "hola@techweek.cl", **overrides)
  end

  context "when sending is off (the default outside production)" do
    it "logs the message as sent with the mock id and calls nobody" do
      allow(AppConfig).to receive(:instance).and_return(configured)

      EventMailer.with(event: event).submitted.deliver_now

      record = OutboundEmail.sole
      expect(record).to have_attributes(template_name: "event_submitted", to: "host@example.com", status: "sent",
        external_message_id: "dev-mock-id", subject: "Recibimos tu evento · Chile Tech Week 2025")
      expect(record.html_content).to include("Recibimos tu evento")
      expect(record.text_content).to include("Recibimos tu evento")
      expect(record.template_data).to eq("event_id" => event.id)
      expect(record.sent_at).to be_present
    end
  end

  context "when sending is on" do
    let(:config) { configured(send_emails: true, resend_api_key: "re_test", email_catch_all: "dev@techweek.cl") }

    before { allow(AppConfig).to receive(:instance).and_return(config) }

    it "posts to Resend and records the message id — to the catch-all outside production" do
      body = nil
      request = stub_request(:post, "https://api.resend.com/emails").with { |req| body = JSON.parse(req.body) }.to_return(status: 200, body: {id: "msg_1"}.to_json)

      EventMailer.with(event: event).submitted.deliver_now

      expect(request).to have_been_requested
      expect(OutboundEmail.sole).to have_attributes(status: "sent", external_message_id: "msg_1", to: "host@example.com")
      expect(body).to include("to" => ["dev@techweek.cl"], "from" => "Chile Tech Week <hola@techweek.cl>", "reply_to" => "hola@techweek.cl")
      expect(body["subject"]).to eq("Recibimos tu evento · Chile Tech Week 2025")
    end

    it "records Resend's error, marks the row failed and raises so the job retries" do
      stub_request(:post, "https://api.resend.com/emails").to_return(status: 422, body: {name: "validation_error", message: "Invalid `to`"}.to_json)

      expect { EventMailer.with(event: event).submitted.deliver_now }.to raise_error(ResendClient::Error, /validation_error - Invalid `to`/)
      expect(OutboundEmail.sole).to have_attributes(status: "failed", failure_reason: a_string_including("Invalid `to`"))
    end

    it "refuses to send outside production without a catch-all address" do
      allow(AppConfig).to receive(:instance).and_return(configured(send_emails: true, resend_api_key: "re_test"))

      expect { EventMailer.with(event: event).submitted.deliver_now }.to raise_error(ResendClient::Error, /EMAIL_CATCH_ALL/)
      expect(OutboundEmail.sole.status).to eq("failed")
    end
  end

  describe ".send_stored" do
    it "sends a stored message again as a new row and leaves the original alone" do
      original = create(:outbound_email, status: "failed", failure_reason: "boom", template_name: "event_submitted", subject: "Hola")

      copy = original.resend!

      expect(copy).not_to eq(original)
      expect(copy).to have_attributes(status: "sent", subject: "Hola", template_name: "event_submitted", external_message_id: "dev-mock-id")
      expect(original.reload.status).to eq("failed")
    end
  end
end
