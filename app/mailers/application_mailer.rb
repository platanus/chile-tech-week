class ApplicationMailer < ActionMailer::Base
  default from: -> { AppConfig.instance.email_from }, reply_to: -> { AppConfig.instance.email_reply_to }
  layout "mailer"

  helper_method :contact_email, :site_url

  def contact_email
    AppConfig.instance.contact_email
  end

  def site_url
    AppConfig.instance.site_url
  end

  private

  # OutboundEmail::Delivery reads these two headers into the log.
  def template(name, data = {})
    headers["X-Template"] = name.to_s
    headers["X-Template-Data"] = data.to_json
  end
end
