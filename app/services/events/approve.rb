module Events
  # An admin approves a submission: the site creates its Luma event (private, with the hosts
  # invited to edit it), the event waits for the host to finish it, and the host is told.
  class Approve
    Result = Data.define(:ok, :error)

    def initialize(event)
      @event = event
    end

    def call
      luma = Luma::EventCreator.new(@event).call
      @event.update!(
        state: "waiting_luma_edit", approved_at: Time.current, waiting_luma_edit_at: Time.current, rejected_at: nil,
        luma_event_url: luma.url, luma_event_api_id: luma.api_id, luma_event_created_at: Time.current
      )
      EventNotifications.approved(@event)
      Result.new(ok: true, error: nil)
    rescue Luma::Error => e
      Rails.logger.error("Luma event creation failed for #{@event.id}: #{e.message}")
      Result.new(ok: false, error: "No se pudo crear el evento en Luma: #{e.message}")
    end
  end
end
