class OutboundEmail
  # The Action Mailer delivery method (`config.action_mailer.delivery_method = :outbound`):
  # every message becomes an OutboundEmail row, then goes out through SMTP — or, when
  # sending is off (SEND_EMAILS=false, the default outside production), is marked sent with a
  # mock id so the log still shows what would have gone. Outside production the recipient
  # is replaced by EMAIL_CATCH_ALL. Failures are recorded on the row and re-raised so the
  # mail job retries.
  class Delivery
    class Error < StandardError; end

    MOCK_MESSAGE_ID = "dev-mock-id".freeze

    def initialize(_settings = {})
    end

    # Mail::Message → OutboundEmail. The mailer names the template in the X-Template header.
    def deliver!(mail)
      record = OutboundEmail.create!(
        template_name: mail["X-Template"]&.value.presence || "unknown",
        to: Array(mail.to).first.to_s,
        cc: mail.cc.presence,
        bcc: mail.bcc.presence,
        subject: mail.subject.to_s,
        html_content: html_of(mail),
        text_content: text_of(mail),
        template_data: template_data_of(mail),
        status: "pending"
      )
      self.class.send_record(record)
    end

    # A stored message, sent again as a fresh row (the admin's "resend").
    def self.send_stored(original)
      record = OutboundEmail.create!(
        original.slice(:template_name, :to, :cc, :bcc, :subject, :html_content, :text_content, :template_data).merge(status: "pending")
      )
      send_record(record)
    end

    def self.send_record(record, config: AppConfig.instance)
      unless config.send_emails
        record.mark_sent!(MOCK_MESSAGE_ID)
        Rails.logger.info("📧 Not sent (SEND_EMAILS is off): #{record.subject} → #{record.to}")
        return record
      end

      message = OutboundEmailMailer.queued(record, config: config).deliver_now
      record.mark_sent!(message.message_id)
      record
    rescue => e
      record.mark_failed!(e.message)
      raise
    end

    private

    def html_of(mail)
      part = mail.html_part || ((mail.mime_type == "text/html") ? mail : nil)
      part&.decoded.to_s
    end

    def text_of(mail)
      part = mail.text_part || ((mail.mime_type == "text/plain") ? mail : nil)
      part&.decoded.to_s
    end

    def template_data_of(mail)
      raw = mail["X-Template-Data"]&.value
      raw.present? ? JSON.parse(raw) : nil
    rescue JSON::ParserError
      nil
    end
  end
end
