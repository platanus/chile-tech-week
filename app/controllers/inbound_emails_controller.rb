# POST /internal/inbound_emails — where the Cloudflare Worker (workers/inbound-email) posts every
# message the site's address receives. Authenticated by a shared key (INBOUND_EMAIL_KEY); with
# no key configured the endpoint is closed. Answers which handler consumed the mail, or null
# when it was dropped — the Worker forwards those to a person.
class InboundEmailsController < ApplicationController
  skip_forgery_protection

  before_action :authenticate

  def create
    handled = InboundEmails::Router.new.call(InboundEmails::Message.from_params(params))
    render json: {handled: handled}, status: :accepted
  end

  private

  def authenticate
    key = AppConfig.instance.inbound_email_key
    return head :service_unavailable if key.blank?

    given = request.authorization.to_s.delete_prefix("Bearer ")
    head :unauthorized unless ActiveSupport::SecurityUtils.secure_compare(given, key)
  end
end
