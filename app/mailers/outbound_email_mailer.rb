# Sends an already-rendered log entry using SMTP, like ~/hack's queued mailer.
# Bypass :outbound here: logging this transport message would recurse and duplicate rows.
class OutboundEmailMailer < ActionMailer::Base
  self.delivery_method = Rails.env.test? ? :test : :smtp
  self.raise_delivery_errors = true
  self.perform_deliveries = true

  def queued(record, config: AppConfig.instance)
    to = Rails.env.production? ? record.to : config.email_catch_all.presence
    raise OutboundEmail::Delivery::Error, "EMAIL_CATCH_ALL must be set to send mail outside production" if to.blank?
    if [config.smtp_host, config.smtp_user, config.smtp_password].any?(&:blank?)
      raise OutboundEmail::Delivery::Error, "SMTP_HOST, SMTP_USER and SMTP_PASSWORD must be set to send mail"
    end

    mail(
      from: config.email_from, reply_to: config.email_reply_to,
      to: to, cc: Rails.env.production? ? record.cc : nil, bcc: Rails.env.production? ? record.bcc : nil,
      subject: record.subject, delivery_method_options: config.smtp_settings
    ) do |format|
      format.text { render plain: record.text_content } if record.text_content.present?
      # These bodies were rendered by our own mailers and stored for exact resends.
      format.html { render html: record.html_content.html_safe, layout: false }
    end
  end
end
