module Events
  # An admin approves a submission: the site creates its Luma event (private, with the hosts
  # invited to edit it), the event waits for the host to finish it, and the host is told.
  # An event the host already made on Luma (an import) needs none of that: it is public and
  # theirs, so it goes straight into the calendar and the programme.
  class Approve
    Result = Data.define(:ok, :error)

    def initialize(event)
      @event = event
    end

    def call
      return list_imported if @event.luma_imported?

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

    private

    # Pulls the host's latest edits first (it may have changed, or been cancelled, since it was
    # submitted), then lists the event in the Luma calendar and publishes it.
    def list_imported
      if Luma::Sync.new.sync_event(@event, notify: false) == :cancelled
        return Result.new(ok: false, error: "El evento fue cancelado en Luma.")
      end

      calendar_event_id = Luma.client.add_to_calendar(@event.luma_event_api_id)
      now = Time.current
      @event.update!(state: "published", approved_at: now, published_at: now, rejected_at: nil, luma_calendar_event_id: calendar_event_id)
      MirrorLumaCoverJob.perform_later(@event.id, @event.luma_cover_url) if @event.luma_cover_url.present? && !@event.cover.attached?
      EventNotifications.published(@event)
      Result.new(ok: true, error: nil)
    rescue Luma::Error => e
      Rails.logger.error("Luma calendar listing failed for #{@event.id}: #{e.message}")
      Result.new(ok: false, error: "No se pudo agregar el evento al calendario de Luma: #{e.message}")
    end
  end
end
