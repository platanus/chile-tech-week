module Events
  # An admin rejects a submission with a reason the host receives by email.
  class Reject
    def initialize(event, reason:)
      @event = event
      @reason = reason.to_s.strip
    end

    def call
      @event.update!(state: "rejected", rejected_at: Time.current, rejection_reason: @reason, approved_at: nil, published_at: nil)
      EventNotifications.rejected(@event)
      true
    end
  end
end
