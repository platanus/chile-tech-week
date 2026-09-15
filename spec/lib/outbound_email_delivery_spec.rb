require "rails_helper"

RSpec.describe OutboundEmail::Delivery do
  around do |example|
    original_method = OutboundEmailMailer.delivery_method
    example.run
  ensure
    OutboundEmailMailer.delivery_method = original_method
  end

  let(:event) { create(:event, author_email: "host@example.com", title: "Demo Day") }

  def configured(**overrides)
    AppConfig.new(send_emails: false, smtp_host: "smtp.mailgun.org", smtp_port: 587, smtp_user: "", smtp_password: "", email_catch_all: "", email_from: "Chile Tech Week 2026 <events@techweek.cl>", email_reply_to: "hello@techweek.cl", **overrides)
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
    let(:config) { configured(send_emails: true, smtp_user: "postmaster@mg.techweek.cl", smtp_password: "smtp-test-password", email_catch_all: "dev@techweek.cl") }

    before { allow(AppConfig).to receive(:instance).and_return(config) }

    it "delivers the stored bodies and records the SMTP message id, using the catch-all" do
      EventMailer.with(event: event).submitted.deliver_now

      record = OutboundEmail.sole
      message = ActionMailer::Base.deliveries.last
      expect(record).to have_attributes(status: "sent", external_message_id: message.message_id, to: "host@example.com")
      expect(message.to).to eq(["dev@techweek.cl"])
      expect(message.from).to eq(["events@techweek.cl"])
      expect(message[:from].display_names).to eq(["Chile Tech Week 2026"])
      expect(message.reply_to).to eq(["hello@techweek.cl"])
      expect(message.subject).to eq("Recibimos tu evento · Chile Tech Week 2025")
      expect(message.html_part.decoded).to eq(record.html_content)
      expect(message.text_part.decoded).to eq(record.text_content)
    end

    it "uses the configured Mailgun SMTP endpoint, credentials and STARTTLS" do
      OutboundEmailMailer.delivery_method = :smtp
      transport = nil
      allow_any_instance_of(Mail::SMTP).to receive(:deliver!) { |smtp, _message| transport = smtp }

      EventMailer.with(event: event).submitted.deliver_now

      expect(transport.settings).to include(
        address: "smtp.mailgun.org", port: 587, user_name: "postmaster@mg.techweek.cl", password: "smtp-test-password",
        authentication: :plain, enable_starttls: true, open_timeout: 5, read_timeout: 20
      )
      expect(OutboundEmail.sole).to be_sent
    end

    it "records SMTP failures and raises so the job retries" do
      OutboundEmailMailer.delivery_method = :smtp
      allow_any_instance_of(Mail::SMTP).to receive(:deliver!).and_raise(Net::SMTPAuthenticationError, "535 Authentication failed")

      expect { EventMailer.with(event: event).submitted.deliver_now }.to raise_error(Net::SMTPAuthenticationError)
      expect(OutboundEmail.sole).to have_attributes(status: "failed", failure_reason: a_string_including("Authentication failed"), sent_at: nil)
    end

    it "refuses to send outside production without a catch-all address" do
      config.email_catch_all = ""

      expect { EventMailer.with(event: event).submitted.deliver_now }.to raise_error(OutboundEmail::Delivery::Error, /EMAIL_CATCH_ALL/)
      expect(OutboundEmail.sole.status).to eq("failed")
    end

    it "fails clearly when SMTP credentials are missing" do
      config.smtp_password = ""

      expect { EventMailer.with(event: event).submitted.deliver_now }.to raise_error(OutboundEmail::Delivery::Error, /SMTP_PASSWORD/)
      expect(OutboundEmail.sole.status).to eq("failed")
    end

    it "drops cc and bcc outside production" do
      record = create(:outbound_email, cc: ["cc@example.com"], bcc: ["bcc@example.com"])

      described_class.send_record(record)

      message = ActionMailer::Base.deliveries.last
      expect(message.to).to eq(["dev@techweek.cl"])
      expect(message.cc).to be_nil
      expect(message.bcc).to be_nil
    end

    it "keeps real recipients in production" do
      allow(Rails).to receive(:env).and_return(ActiveSupport::StringInquirer.new("production"))
      # The class stays on the test transport while exercising production recipient rules.
      OutboundEmailMailer.delivery_method = :test
      record = create(:outbound_email, to: "host@example.com", cc: ["cc@example.com"], bcc: ["bcc@example.com"])

      described_class.send_record(record)

      message = ActionMailer::Base.deliveries.last
      expect(message.to).to eq(["host@example.com"])
      expect(message.cc).to eq(["cc@example.com"])
      expect(message.bcc).to eq(["bcc@example.com"])
    end

    it "resends the stored content through the same SMTP flow as a new log entry" do
      original = create(:outbound_email, status: "failed", html_content: "<p>Stored HTML</p>", text_content: "Stored text")

      expect { original.resend! }.to change(OutboundEmail, :count).by(1)

      copy = OutboundEmail.where.not(id: original.id).sole
      message = ActionMailer::Base.deliveries.last
      expect(copy).to have_attributes(status: "sent", external_message_id: message.message_id)
      expect(message.html_part.decoded).to eq("<p>Stored HTML</p>")
      expect(message.text_part.decoded).to eq("Stored text")
      expect(original.reload).to be_failed
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
