module Events
  # An admin takes an approved event down: the Luma event is cancelled (irreversible, Luma
  # tells its guests), the event leaves the programme as `deleted`, and the host hears the
  # reason by email. Luma goes first, so a failure there leaves the event exactly as it was.
  class TakeDown
    Result = Data.define(:ok, :error)

    TAKEABLE_STATES = %w[waiting_luma_edit published].freeze

    def initialize(event, reason:)
      @event = event
      @reason = reason.to_s.strip
    end

    def call
      return failure("Solo se puede dar de baja un evento en edición o publicado.") unless TAKEABLE_STATES.include?(@event.state)
      return failure("Escribe el motivo de la baja.") if @reason.blank?

      cancel_on_luma
      @event.update!(state: "deleted", deleted_at: Time.current, deletion_reason: @reason)
      EventNotifications.taken_down(@event)
      Result.new(ok: true, error: nil)
    rescue Luma::Error => e
      Rails.logger.error("Luma cancellation failed for #{@event.id}: #{e.message}")
      failure("No se pudo cancelar el evento en Luma: #{e.message}")
    end

    private

    # Already gone from Luma (cancelled there meanwhile, or deleted by hand): nothing to cancel.
    def cancel_on_luma
      return if @event.luma_event_api_id.blank?

      Luma.client.cancel_event(@event.luma_event_api_id)
    rescue Luma::NotFound
      nil
    end

    def failure(message)
      Result.new(ok: false, error: message)
    end
  end
end
