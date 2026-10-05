# Posts a new submission to the organisers' WhatsApp group (WhatsappNotifier). wpp-server
# dedupes on the idempotency key, so a retry after a timeout never posts twice.
class WhatsappNotificationJob < ApplicationJob
  retry_on WppClient::Error, wait: :polynomially_longer, attempts: 5

  def perform(event_id)
    event = Event.find_by(id: event_id)
    WhatsappNotifier.new_submission(event) if event
  end
end
