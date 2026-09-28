module Events
  # The host, done editing the Luma event, publishes: the Luma event goes public, the site
  # pulls the host's latest edits from it (rather than waiting for the next Luma::Sync), the
  # event appears in the programme, the host gets the confirmation.
  class Publish
    Result = Data.define(:ok, :error)

    def initialize(event)
      @event = event
    end

    def call
      return Result.new(ok: false, error: "El evento no está listo para publicarse.") unless @event.waiting_luma_edit?

      if @event.luma_event_api_id.present?
        Luma.client.update_event(@event.luma_event_api_id, visibility: "public")
        # A failed pull is logged by Sync and left to the next scheduled run; it does not hold
        # back the publication. An event the host cancelled on Luma has just been taken down.
        if Luma::Sync.new.sync_event(@event, notify: false) == :cancelled
          return Result.new(ok: false, error: "El evento fue cancelado en Luma.")
        end
      end
      @event.update!(state: "published", published_at: Time.current)
      EventNotifications.published(@event)
      Result.new(ok: true, error: nil)
    rescue Luma::Error => e
      Rails.logger.error("Luma visibility update failed for #{@event.id}: #{e.message}")
      Result.new(ok: false, error: "No se pudo publicar el evento en Luma: #{e.message}")
    end
  end
end
