module Luma
  # Mirrors the host's Luma edits into the current week's events awaiting edit, published or
  # hidden: title, dates, URL, cover artwork, full Markdown body and visibility. A published event
  # the host makes private on Luma is hidden (out of the programme) until it is public again; one
  # cancelled on Luma is taken down. The host hears about title/date changes, the hiding and the
  # takedown. A failure is reported (Rails.error, so ErrorNotifier posts it) and the other events
  # still sync.
  class Sync
    Outcome = Data.define(:synced, :updated, :cancelled, :failed)

    SYNCED_STATES = %w[waiting_luma_edit published hidden].freeze

    def initialize(client: Luma.client, internal: Luma.internal)
      @client = client
      @internal = internal
    end

    def call
      updated = cancelled = failed = 0
      scope = ::Event.where(edition: ::Week.current.year).where.not(luma_event_api_id: nil).where(state: SYNCED_STATES)
      scope.find_each do |event|
        case sync_event(event)
        when :updated, :hidden, :shown then updated += 1
        when :cancelled then cancelled += 1
        when :failed then failed += 1
        end
      end
      Outcome.new(synced: scope.count, updated: updated, cancelled: cancelled, failed: failed)
    end

    # One event, now: :updated, :hidden, :shown, :unchanged, :cancelled or :failed. `notify: false` skips the
    # host's "your event changed" mail — for when the host is the one who just made the change
    # (Events::Publish syncs right before going public).
    def sync_event(event, notify: true)
      apply(event, fetch(event), notify:)
    rescue NotFound => e
      return take_down(event) if e.gone?

      report(e, event)
    rescue Error => e
      report(e, event)
    end

    private

    # An imported event is the host's, not this calendar's: the site's account reads it as one of
    # its hosts, through Luma's web API — the only way to keep up with one the host made private.
    def fetch(event)
      event.luma_imported? ? @internal.get_event(event.luma_event_api_id) : @client.get_event(event.luma_event_api_id)
    end

    def report(error, event)
      Rails.error.report(error, context: {event_id: event.id, luma_event_api_id: event.luma_event_api_id, title: event.title})
      :failed
    end

    def apply(event, remote, notify:)
      outcome = mirror(event, remote, notify:)
      mirror_visibility(event, remote.visibility, notify:) || outcome
    end

    def mirror(event, remote, notify:)
      changes = {}
      changes[:title] = {old: event.title, new: remote.name} if remote.name.present? && remote.name != event.title
      starts_at = Time.zone.parse(remote.start_at.to_s)
      ends_at = Time.zone.parse(remote.end_at.to_s)
      changes[:starts_at] = {old: event.starts_at, new: starts_at} if starts_at && starts_at != event.starts_at
      changes[:ends_at] = {old: event.ends_at, new: ends_at} if ends_at && ends_at != event.ends_at
      url_changed = remote.url.present? && remote.url != event.luma_event_url
      cover_changed = remote.cover_url.present? && remote.cover_url != event.luma_cover_url
      # Missing/null means unavailable; an empty string means the host cleared the body.
      description_changed = !remote.description_md.nil? && remote.description_md != event.luma_description_md
      return :unchanged if changes.empty? && !url_changed && !cover_changed && !description_changed

      event.update!(
        title: changes.key?(:title) ? remote.name : event.title,
        starts_at: starts_at || event.starts_at,
        ends_at: ends_at || event.ends_at,
        luma_event_url: remote.url.presence || event.luma_event_url,
        luma_cover_url: remote.cover_url.presence || event.luma_cover_url,
        luma_description_md: description_changed ? remote.description_md : event.luma_description_md
      )
      # New artwork: fetch our own copy. The host is not told — the picture is theirs.
      MirrorLumaCoverJob.perform_later(event.id, event.luma_cover_url) if cover_changed
      EventMailer.with(event: event, changes: changes).luma_updated.deliver_later if notify && changes.any?
      :updated
    end

    # Luma's visibility decides whether a published event is listed: anything but "public"
    # (private, member-only) hides it, public again lists it again. An event still being edited
    # is private on Luma by design and stays as it is.
    def mirror_visibility(event, visibility, notify:)
      return if visibility.blank?

      event.update!(luma_visibility: visibility) if visibility != event.luma_visibility
      if event.published? && event.hidden_on_luma?
        event.update!(state: "hidden")
        EventMailer.with(event: event).luma_hidden.deliver_later if notify
        :hidden
      elsif event.hidden? && !event.hidden_on_luma?
        event.update!(state: "published")
        :shown
      end
    end

    def take_down(event)
      event.update!(state: "deleted", deleted_at: Time.current)
      EventMailer.with(event: event).luma_cancelled.deliver_later
      :cancelled
    end
  end
end
