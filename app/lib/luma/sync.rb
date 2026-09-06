module Luma
  # Mirrors the host's Luma edits into the events awaiting edit or published: title, dates,
  # URL and the cover artwork. An event cancelled on Luma is taken down here too. The host
  # hears about visible changes (not a bare URL or cover change) and about the takedown.
  class Sync
    Outcome = Data.define(:synced, :updated, :cancelled, :failed)

    def initialize(client: Luma.client)
      @client = client
    end

    def call
      updated = cancelled = failed = 0
      scope = ::Event.where.not(luma_event_api_id: nil).where(state: %w[published waiting_luma_edit])
      scope.find_each do |event|
        case sync(event)
        when :updated then updated += 1
        when :cancelled then cancelled += 1
        when :failed then failed += 1
        end
      end
      Outcome.new(synced: scope.count, updated: updated, cancelled: cancelled, failed: failed)
    end

    private

    def sync(event)
      apply(event, @client.get_event(event.luma_event_api_id))
    rescue NotFound => e
      return take_down(event) if e.canceled?

      Rails.logger.error("Luma sync: #{event.id} not found on Luma: #{e.message}")
      :failed
    rescue Error => e
      Rails.logger.error("Luma sync failed for #{event.id}: #{e.message}")
      :failed
    end

    def apply(event, remote)
      changes = {}
      changes[:title] = {old: event.title, new: remote.name} if remote.name.present? && remote.name != event.title
      starts_at = Time.zone.parse(remote.start_at.to_s)
      ends_at = Time.zone.parse(remote.end_at.to_s)
      changes[:starts_at] = {old: event.starts_at, new: starts_at} if starts_at && starts_at != event.starts_at
      changes[:ends_at] = {old: event.ends_at, new: ends_at} if ends_at && ends_at != event.ends_at
      url_changed = remote.url.present? && remote.url != event.luma_event_url
      cover_changed = remote.cover_url.present? && remote.cover_url != event.luma_cover_url
      return :unchanged if changes.empty? && !url_changed && !cover_changed

      event.update!(
        title: changes.key?(:title) ? remote.name : event.title,
        starts_at: starts_at || event.starts_at,
        ends_at: ends_at || event.ends_at,
        luma_event_url: remote.url.presence || event.luma_event_url,
        luma_cover_url: remote.cover_url.presence || event.luma_cover_url
      )
      # New artwork: fetch our own copy. The host is not told — the picture is theirs.
      MirrorLumaCoverJob.perform_later(event.id, event.luma_cover_url) if cover_changed
      EventMailer.with(event: event, changes: changes).luma_updated.deliver_later if changes.any?
      :updated
    end

    def take_down(event)
      event.update!(state: "deleted", deleted_at: Time.current)
      EventMailer.with(event: event).luma_cancelled.deliver_later
      :cancelled
    end
  end
end
